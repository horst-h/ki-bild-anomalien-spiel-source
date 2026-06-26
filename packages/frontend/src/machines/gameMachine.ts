import { setup, assign, fromPromise, fromCallback } from "xstate";
import { api, type TaskDetails, type SummaryResponse } from "../api/client";

export interface FoundArea {
  areaId: string;
  polygon: { x: number; y: number }[];
  explanation: string;
}

export interface GameContext {
  playerName: string;
  avatarLevel: string;
  gameId: string | null;
  taskCount: number;
  taskIndex: number;
  task: TaskDetails | null;
  remainingTime: number;
  hits: number;
  wrongAttempts: number;
  foundAreas: FoundArea[];
  lastFeedback: "hit" | "duplicate" | "miss" | null;
  resolution: { id: string; polygon: { x: number; y: number }[]; explanation: string; found: boolean }[];
  scorePerTask: { taskIndex: number; score: number }[];
  summary: SummaryResponse | null;
  error: string | null;
}

export type GameEvent =
  | { type: "START_GAME"; playerName: string; avatarLevel: string }
  | { type: "CLICK"; x: number; y: number }
  | { type: "SKIP" }
  | { type: "TICK" }
  | { type: "CONTINUE" }
  | { type: "RESTART" };

const initialContext: GameContext = {
  playerName: "",
  avatarLevel: "",
  gameId: null,
  taskCount: 0,
  taskIndex: 0,
  task: null,
  remainingTime: 0,
  hits: 0,
  wrongAttempts: 0,
  foundAreas: [],
  lastFeedback: null,
  resolution: [],
  scorePerTask: [],
  summary: null,
  error: null,
};

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  actors: {
    startGame: fromPromise(async ({ input }: { input: { playerName: string; avatarLevel: string } }) =>
      api.startGame(input.playerName, input.avatarLevel)
    ),
    loadTask: fromPromise(async ({ input }: { input: { gameId: string; taskIndex: number } }) =>
      api.getTask(input.gameId, input.taskIndex)
    ),
    sendAttempt: fromPromise(
      async ({ input }: { input: { gameId: string; taskIndex: number; x: number; y: number } }) =>
        api.attempt(input.gameId, input.taskIndex, input.x, input.y)
    ),
    finishTask: fromPromise(
      async ({
        input,
      }: {
        input: { gameId: string; taskIndex: number; remainingTime: number; skipped: boolean };
      }) => api.finishTask(input.gameId, input.taskIndex, input.remainingTime, input.skipped)
    ),
    loadSummary: fromPromise(async ({ input }: { input: { gameId: string } }) =>
      api.getSummary(input.gameId)
    ),
    // Tickt einmal pro Sekunde, solange "playing" aktiv ist. Wird beim
    // Verlassen des States automatisch von XState gestoppt.
    ticker: fromCallback(({ sendBack }) => {
      const interval = setInterval(() => sendBack({ type: "TICK" }), 1000);
      return () => clearInterval(interval);
    }),
  },
  guards: {
    timeUp: ({ context }) => context.remainingTime <= 1,
    hasMoreTasks: ({ context }) => context.taskIndex + 1 < context.taskCount,
  },
  actions: {
    applyAttemptResult: assign(({ context, event }: any) => {
      const result = event.output;
      const newFoundAreas =
        result.result === "hit"
          ? [
              ...context.foundAreas,
              { areaId: result.areaId, polygon: result.polygon, explanation: result.explanation },
            ]
          : context.foundAreas;
      return {
        hits: result.hitsSoFar,
        wrongAttempts: result.wrongAttemptsSoFar,
        foundAreas: newFoundAreas,
        lastFeedback: result.result,
      };
    }),
  },
}).createMachine({
  id: "game",
  context: initialContext,
  initial: "idle",
  states: {
    idle: {
      on: {
        START_GAME: {
          target: "starting",
          actions: assign(({ event }) => ({
            playerName: event.playerName,
            avatarLevel: event.avatarLevel,
            error: null,
          })),
        },
      },
    },

    starting: {
      invoke: {
        src: "startGame",
        input: ({ context }) => ({ playerName: context.playerName, avatarLevel: context.avatarLevel }),
        onDone: {
          target: "loadingTask",
          actions: assign(({ event }) => ({
            gameId: event.output.gameId,
            taskCount: event.output.taskCount,
            taskIndex: 0,
          })),
        },
        onError: {
          target: "idle",
          actions: assign({ error: ({ event }: any) => (event.error as Error)?.message ?? "Spiel konnte nicht gestartet werden." }),
        },
      },
    },

    loadingTask: {
      invoke: {
        src: "loadTask",
        input: ({ context }) => ({ gameId: context.gameId!, taskIndex: context.taskIndex }),
        onDone: {
          target: "playing",
          actions: assign(({ event }) => ({
            task: event.output,
            remainingTime: event.output.timeLimitSeconds,
            hits: event.output.hitsSoFar,
            wrongAttempts: event.output.wrongAttemptsSoFar,
            foundAreas: [],
            lastFeedback: null,
          })),
        },
        onError: {
          target: "idle",
          actions: assign({ error: () => "Aufgabe konnte nicht geladen werden." }),
        },
      },
    },

    playing: {
      invoke: { src: "ticker" },
      initial: "waitingForClick",
      on: {
        SKIP: "finishingTask",
        TICK: [
          { guard: "timeUp", target: "finishingTask", actions: assign({ remainingTime: 0 }) },
          { actions: assign(({ context }) => ({ remainingTime: context.remainingTime - 1 })) },
        ],
      },
      states: {
        waitingForClick: {
          on: { CLICK: "checkingClick" },
        },
        checkingClick: {
          invoke: {
            src: "sendAttempt",
            input: ({ context, event }) => {
              const e = event as { x: number; y: number };
              return { gameId: context.gameId!, taskIndex: context.taskIndex, x: e.x, y: e.y };
            },
            onDone: [
              {
                guard: ({ event }) => Boolean(event.output.taskComplete),
                target: "#game.finishingTask",
                actions: "applyAttemptResult",
              },
              { target: "waitingForClick", actions: "applyAttemptResult" },
            ],
            onError: { target: "waitingForClick" },
          },
        },
      },
    },

    finishingTask: {
      invoke: {
        src: "finishTask",
        input: ({ context }) => ({
          gameId: context.gameId!,
          taskIndex: context.taskIndex,
          remainingTime: context.remainingTime,
          skipped: context.remainingTime > 0 && context.hits < (context.task?.totalAreas ?? 0),
        }),
        onDone: {
          target: "roundResult",
          actions: assign(({ event, context }) => ({
            resolution: event.output.resolution.areas,
            scorePerTask: [...context.scorePerTask, { taskIndex: context.taskIndex, score: event.output.score }],
          })),
        },
        onError: {
          target: "idle",
          actions: assign({ error: () => "Runde konnte nicht abgeschlossen werden." }),
        },
      },
    },

    roundResult: {
      on: {
        CONTINUE: [
          {
            guard: "hasMoreTasks",
            target: "loadingTask",
            actions: assign(({ context }) => ({ taskIndex: context.taskIndex + 1 })),
          },
          { target: "loadingSummary" },
        ],
      },
    },

    loadingSummary: {
      invoke: {
        src: "loadSummary",
        input: ({ context }) => ({ gameId: context.gameId! }),
        onDone: {
          target: "summary",
          actions: assign(({ event }) => ({ summary: event.output })),
        },
        onError: {
          target: "idle",
          actions: assign({ error: () => "Gesamtauswertung konnte nicht geladen werden." }),
        },
      },
    },

    summary: {
      on: { RESTART: { target: "idle", actions: assign(() => initialContext) } },
    },
  },
});
