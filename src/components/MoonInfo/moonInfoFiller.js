import { getCurrentMoonData } from "@utils/currentMoonData";

function addPhase(phase) {
  const phaseEl = document.querySelector("#moonInfo_waxWane > b");
  if (!phaseEl) return;

  phaseEl.textContent = phase;
}
function addCurrentPhase(currentPhase) {
  const currentPhaseEl = document.querySelector("#moonInfo_phase > b");
  if (!currentPhaseEl) return;

  currentPhaseEl.textContent = currentPhase;
}
function addMoonAge(moonAge) {
  const moonAgeEl = document.querySelector("#moonInfo_age > b");
  if (!moonAgeEl) return;

  moonAgeEl.textContent = moonAge;
}
function addMoonAgePercent(moonAgePercent) {
  const moonAgePercentEl = document.querySelector("#moonInfo_agePercent > b");
  if (!moonAgePercentEl) return;

  moonAgePercentEl.textContent = moonAgePercent;
}

function addMoonInfoToDom() {
  const { phase, lunarAge, lunarAgePercent, waxWaneText, emojiForLunarPhase } =
    getCurrentMoonData();

  addPhase(waxWaneText);
  addCurrentPhase(`${emojiForLunarPhase}${phase}`);
  addMoonAge(lunarAge);
  addMoonAgePercent(lunarAgePercent);
}

addMoonInfoToDom();
