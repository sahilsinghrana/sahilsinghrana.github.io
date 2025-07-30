import MoonEvent from "./MoonEvent";

export default [
  new MoonEvent(
    "Full Moon (Sturgeon Moon)",
    new Date("2025-09-10T00:00:00Z"),
    "The full moon in August is often referred to as the Sturgeon Moon, named after the fish that were abundant in North American lakes during this time.",
    "https://www.almanac.com/content/full-moon-august",
  ),
].sort((a, b) => {
  return a.date.getTime() - b.date.getTime();
}) as MoonEvent[];
