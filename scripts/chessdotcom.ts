export const CHESS_USERNAME = "sahilsinghrana";
const ChessDotComBaseUrl = `https://api.chess.com/pub/player/${CHESS_USERNAME}`;

const fetchNoStore = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => res.json());

export async function getPlayerProfile() {
  try {
    const res = await fetchNoStore(ChessDotComBaseUrl);
    return res;
  } catch (err) {
    console.error(err);
  }
}

export async function getPlayerStats() {
  try {
    const res = await fetchNoStore(ChessDotComBaseUrl + "/stats");
    return res;
  } catch (err) {
    console.error(err);
  }
}

export async function getPlayerLatestMonthGameArchive() {
  try {
    const res = await fetchNoStore(ChessDotComBaseUrl + "/games/archives");
    if (!Array.isArray(res.archives) || !res.archives.length) return;

    const latestLink = res.archives.at(-1);
    const previousLink = res.archives.at(-2);
    if (!latestLink) return;

    const latestGames = await fetchNoStore(latestLink);
    const previousGames = previousLink
      ? await fetchNoStore(previousLink)
      : { games: [] };

    return [
      ...(previousGames?.games || []),
      ...(latestGames?.games || []),
    ];
  } catch (err) {
    console.error(err);
  }
}

export async function getLastFiveGames() {
  const latestGames = await getPlayerLatestMonthGameArchive();

  if (!latestGames) return;

  return (
    latestGames
      // some games are of coach and etc
      .filter((g) => ["blitz", "rapid", "bullet"].includes(g.time_class))
      .slice(-5)
      .reverse()
  );
}
