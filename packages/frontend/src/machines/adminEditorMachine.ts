import { setup, assign } from "xstate";

export interface Point {
  x: number; // normalisiert 0..1
  y: number; // normalisiert 0..1
}

export interface Area {
  id: string;
  polygon: Point[];
  explanation: string;
}

interface EditorContext {
  areas: Area[];
  currentPoints: Point[];
}

export type EditorEvent =
  | { type: "START_DRAWING" }
  | { type: "ADD_POINT"; x: number; y: number }
  | { type: "UNDO_LAST_POINT" }
  | { type: "FINISH_POLYGON" }
  | { type: "CANCEL_DRAWING" }
  | { type: "DELETE_AREA"; id: string }
  | { type: "SET_EXPLANATION"; id: string; explanation: string }
  | { type: "SET_AREAS"; areas: Area[] };

export const adminEditorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    hasEnoughPoints: ({ context }) => context.currentPoints.length >= 3,
  },
}).createMachine({
  id: "adminEditor",
  context: { areas: [], currentPoints: [] },
  initial: "idle",
  states: {
    idle: {
      on: {
        START_DRAWING: "drawing",
        DELETE_AREA: {
          actions: assign(({ context, event }) => ({
            areas: context.areas.filter((a) => a.id !== event.id),
          })),
        },
        SET_EXPLANATION: {
          actions: assign(({ context, event }) => ({
            areas: context.areas.map((a) =>
              a.id === event.id ? { ...a, explanation: event.explanation } : a
            ),
          })),
        },
        // Wird beim Laden vorhandener Bilddaten aufgerufen
        SET_AREAS: {
          actions: assign(({ event }) => ({ areas: event.areas, currentPoints: [] })),
        },
      },
    },

    drawing: {
      on: {
        ADD_POINT: {
          actions: assign(({ context, event }) => ({
            currentPoints: [...context.currentPoints, { x: event.x, y: event.y }],
          })),
        },
        UNDO_LAST_POINT: {
          actions: assign(({ context }) => ({
            currentPoints: context.currentPoints.slice(0, -1),
          })),
        },
        FINISH_POLYGON: {
          guard: "hasEnoughPoints",
          target: "idle",
          actions: assign(({ context }) => ({
            areas: [
              ...context.areas,
              {
                // crypto.randomUUID() ist in modernen Browsern verfügbar
                id: crypto.randomUUID(),
                polygon: context.currentPoints,
                explanation: "",
              },
            ],
            currentPoints: [],
          })),
        },
        CANCEL_DRAWING: {
          target: "idle",
          actions: assign(() => ({ currentPoints: [] })),
        },
      },
    },
  },
});
