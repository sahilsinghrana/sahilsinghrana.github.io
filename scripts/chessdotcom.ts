export const CHESS_USERNAME = "sahilsinghrana";
const ChessDotComBaseUrl = `https://api.chess.com/pub/player/${CHESS_USERNAME}`;

export async function getPlayerProfile() {
  try {
    const res = await fetch(ChessDotComBaseUrl).then((res) => res.json());
    return res;
  } catch (err) {
    console.error(err);
  }
}

export async function getPlayerStats() {
  try {
    const res = await fetch(ChessDotComBaseUrl + "/stats").then((res) =>
      res.json(),
    );

    return res;
  } catch (err) {
    console.error(err);
  }
}

export async function getPlayerLatestMonthGameArchive() {
  try {
    const res = await fetch(ChessDotComBaseUrl + "/games/archives").then(
      (res) => res.json(),
    );
    if (!Array.isArray(res.archives) || !res.archives.length) return;

    const latestLink = res.archives.at(-1);
    const latestLink2 = res.archives.at(-2);
    if (!latestLink) return;

    const latestGames = await fetch(latestLink).then((res) => res.json());
    const latestGames2 = await fetch(latestLink2).then((res) => res.json());

    const combinedGames = [
      ...(latestGames2?.games || []),
      latestGames?.games || [],
    ];

    return combinedGames;
  } catch (err) {
    console.error(err);
  }
}

export async function getLastFiveGames() {
  const latestGames = await getPlayerLatestMonthGameArchive();

  if (!latestGames) return;

  return (
    latestGames
      .slice(-10)
      // some games are of coach and etc
      .filter((g) => ["blitz", "rapid", "bullet"].includes(g.time_class))
      .slice(-5)
      .reverse()
  );
}
