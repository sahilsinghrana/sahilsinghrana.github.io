import { Moon } from "lunarphase-js";

export function getCurrentMoonPhase() {
  const phase = Moon.lunarPhase();
  return phase;
}

export function getCurrentMoonData() {
  const phase = getCurrentMoonPhase();
  const isWaxing = Moon.isWaxing();
  const isWaning = Moon.isWaning();
  const lunarAge = Moon.lunarAge().toFixed(2).concat(" Days");
  const emojiForLunarPhase = Moon.emojiForLunarPhase(phase).concat(" ", phase);
  const lunarDistance = Moon.lunarDistance().toFixed(2);
  const lunarAgePercent = (Moon.lunarAgePercent() * 100).toFixed(2).concat("%");

  return {
    phase,
    isWaxing,
    isWaning,
    lunarAge,
    emojiForLunarPhase,
    lunarDistance,
    lunarAgePercent,
  };
}
