import { getCurrentMoonData } from "@utils/moonData";

const { isWaxing, isWaning, lunarAge, lunarDistance, lunarAgePercent, phase } =
  getCurrentMoonData();

const waxWaneText = isWaxing ? "Waxing" : isWaning ? "Waning" : "";

const phaseEl = document.querySelector("#moonInfo_phase > b");
const ageEl = document.querySelector("#moonInfo_age > b");
const waxWaneEl = document.querySelector("#moonInfo_waxWane > b");
const distanceEl = document.querySelector("#moonInfo_distance > b");
const agePercentEl = document.querySelector("#moonInfo_agePercent > b");

if (waxWaneEl) waxWaneEl.innerHTML = waxWaneText;
if (ageEl) ageEl.innerHTML = lunarAge;
if (distanceEl) distanceEl.innerHTML = lunarDistance;
if (agePercentEl) agePercentEl.innerHTML = lunarAgePercent;
if (phaseEl) phaseEl.innerHTML = phase;
