import { setup, assign } from "xstate";

export interface AppContext {
  playerName: string;
  avatarLevel: string;
  adminCurrentImageId: string | null;
}

export type AppEvent =
  | { type: "START_GAME_FLOW" }
  | { type: "SUBMIT_PLAYER"; playerName: string; avatarLevel: string }
  | { type: "GAME_FINISHED" }
  | { type: "VIEW_LEADERBOARD" }
  | { type: "BACK_TO_START" }
  | { type: "GO_ADMIN" }
  | { type: "ADMIN_LOGGED_IN" }
  | { type: "ADMIN_LOGGED_OUT" }
  | { type: "ADMIN_EDIT_IMAGE"; imageId: string }
  | { type: "ADMIN_BACK_TO_LIST" };

const initialContext: AppContext = {
  playerName: "",
  avatarLevel: "waldfuchs",
  adminCurrentImageId: null,
};

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
  },
}).createMachine({
  id: "app",
  context: initialContext,
  initial: "start",
  states: {
    start: {
      on: {
        START_GAME_FLOW: "nameAvatar",
        VIEW_LEADERBOARD: "leaderboard",
        GO_ADMIN: "adminLogin",
      },
    },

    nameAvatar: {
      on: {
        SUBMIT_PLAYER: {
          target: "game",
          actions: assign(({ event }) => ({
            playerName: event.playerName,
            avatarLevel: event.avatarLevel,
          })),
        },
        BACK_TO_START: "start",
      },
    },

    game: {
      on: {
        GAME_FINISHED: "start",
      },
    },

    leaderboard: {
      on: {
        BACK_TO_START: "start",
      },
    },

    adminLogin: {
      on: {
        ADMIN_LOGGED_IN: "adminImageList",
        BACK_TO_START: "start",
      },
    },

    adminImageList: {
      on: {
        ADMIN_EDIT_IMAGE: {
          target: "adminImageEditor",
          actions: assign(({ event }) => ({ adminCurrentImageId: event.imageId })),
        },
        ADMIN_LOGGED_OUT: {
          target: "start",
          actions: assign(() => ({ adminCurrentImageId: null })),
        },
      },
    },

    adminImageEditor: {
      on: {
        ADMIN_BACK_TO_LIST: "adminImageList",
        ADMIN_LOGGED_OUT: {
          target: "start",
          actions: assign(() => ({ adminCurrentImageId: null })),
        },
      },
    },
  },
});
