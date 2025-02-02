import { Moon, LunarPhase } from "lunarphase-js";

interface MoonData {
  phase: LunarPhase;
  isWaxing: ReturnType<typeof Moon.isWaxing>;
  isWaning: ReturnType<typeof Moon.isWaning>;
  lunarAge: string;
  emojiForLunarPhase: string;
  lunarDistance: string;
  lunarAgePercent: string;
  waxWaneText: string;
}

export function getCurrentMoonData(): MoonData {
  const phase = Moon.lunarPhase();
  const isWaxing = Moon.isWaxing();
  const isWaning = Moon.isWaning();
  const lunarAge = Moon.lunarAge().toFixed(2).concat(" Days");
  const emojiForLunarPhase = Moon.emojiForLunarPhase(phase);
  const lunarDistance = Moon.lunarDistance().toFixed(2);
  const lunarAgePercent = (Moon.lunarAgePercent() * 100).toFixed(2).concat("%");

  const waxWaneText = isWaxing ? "Waxing" : isWaning ? "Waning" : "";

  return {
    phase,
    isWaxing,
    isWaning,
    lunarAge,
    emojiForLunarPhase,
    lunarDistance,
    lunarAgePercent,
    waxWaneText,
  };
}
