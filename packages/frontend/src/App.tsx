import { useMachine } from "@xstate/react";
import { appMachine } from "./app/AppMachine";
import { StartScreen } from "./screens/StartScreen/StartScreen";
import { NameAvatarScreen } from "./screens/NameAvatarScreen/NameAvatarScreen";
import { GameScreen } from "./screens/GameScreen/GameScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen/LeaderboardScreen";
import { AdminLoginScreen } from "./screens/admin/AdminLoginScreen/AdminLoginScreen";
import { AdminImageList } from "./screens/admin/AdminImageList/AdminImageList";
import { AdminImageEditor } from "./screens/admin/AdminImageEditor/AdminImageEditor";

export function App() {
  const [state, send] = useMachine(appMachine);

  if (state.matches("start")) {
    return (
      <StartScreen
        onStartGame={() => send({ type: "START_GAME_FLOW" })}
        onViewLeaderboard={() => send({ type: "VIEW_LEADERBOARD" })}
        onGoAdmin={() => send({ type: "GO_ADMIN" })}
      />
    );
  }

  if (state.matches("nameAvatar")) {
    return (
      <NameAvatarScreen
        onSubmit={(playerName, avatarLevel) =>
          send({ type: "SUBMIT_PLAYER", playerName, avatarLevel })
        }
        onBack={() => send({ type: "BACK_TO_START" })}
      />
    );
  }

  if (state.matches("game")) {
    return (
      <GameScreen
        playerName={state.context.playerName}
        avatarLevel={state.context.avatarLevel}
        onGameFinished={() => send({ type: "GAME_FINISHED" })}
      />
    );
  }

  if (state.matches("leaderboard")) {
    return <LeaderboardScreen onBack={() => send({ type: "BACK_TO_START" })} />;
  }

  if (state.matches("adminLogin")) {
    return (
      <AdminLoginScreen
        onLoginSuccess={() => send({ type: "ADMIN_LOGGED_IN" })}
        onBack={() => send({ type: "BACK_TO_START" })}
      />
    );
  }

  if (state.matches("adminImageList")) {
    return (
      <AdminImageList
        onEditImage={(imageId) => send({ type: "ADMIN_EDIT_IMAGE", imageId })}
        onLogout={() => send({ type: "ADMIN_LOGGED_OUT" })}
      />
    );
  }

  if (state.matches("adminImageEditor")) {
    const imageId = state.context.adminCurrentImageId;
    // Invariante: adminCurrentImageId ist immer gesetzt, wenn wir in adminImageEditor sind
    if (!imageId) return null;
    return (
      <AdminImageEditor
        imageId={imageId}
        onBack={() => send({ type: "ADMIN_BACK_TO_LIST" })}
        onLogout={() => send({ type: "ADMIN_LOGGED_OUT" })}
      />
    );
  }

  return null;
}
