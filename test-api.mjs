import fetch from 'node-fetch';

const BASE_URL = "http://localhost:3001/api";

console.log("🧪 Testing API Endpoints...\n");

try {
  // 1. Start Game
  console.log("1️⃣  POST /api/games - Spiel starten");
  const gameRes = await fetch(`${BASE_URL}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName: "TestPlayer", avatarLevel: "waldfuchs" }),
  });
  const gameData = await gameRes.json();
  console.log(`   ✅ Response:`, gameData);

  if (!gameData.gameId) {
    console.error("   ❌ No gameId returned!");
    process.exit(1);
  }

  const gameId = gameData.gameId;
  const taskIndex = 0;

  // 2. Get Task
  console.log(`\n2️⃣  GET /api/games/${gameId}/tasks/0 - Task laden`);
  const taskRes = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}`);
  const taskData = await taskRes.json();
  console.log(`   ✅ Response:`, {
    imageUrl: taskData.imageUrl,
    timeLimitSeconds: taskData.timeLimitSeconds,
    totalAreas: taskData.totalAreas,
  });

  // 3. Attempt (Hit)
  console.log(`\n3️⃣  POST /api/games/${gameId}/tasks/0/attempt - Klick Test`);
  const attemptRes = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: 0.5, y: 0.5 }),
  });
  const attemptData = await attemptRes.json();
  console.log(`   ✅ Response:`, {
    result: attemptData.result,
    hitsSoFar: attemptData.hitsSoFar,
    totalAreas: attemptData.totalAreas,
  });

  // 4. Finish Task
  console.log(`\n4️⃣  POST /api/games/${gameId}/tasks/0/finish - Runde beenden`);
  const finishRes = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remainingTimeSeconds: 30, skipped: false }),
  });
  const finishData = await finishRes.json();
  console.log(`   ✅ Response:`, { score: finishData.score });

  // 5. Get Leaderboard
  console.log(`\n5️⃣  GET /api/leaderboard - Leaderboard`);
  const leaderRes = await fetch(`${BASE_URL}/leaderboard`);
  const leaderData = await leaderRes.json();
  console.log(`   ✅ Response: ${leaderData.length} Einträge`);
  if (leaderData.length > 0) {
    console.log(`      Top Entry:`, leaderData[0]);
  }

  console.log("\n✅ Alle Tests erfolgreich!");
} catch (err) {
  console.error("❌ Test fehlgeschlagen:", err.message);
  process.exit(1);
}
