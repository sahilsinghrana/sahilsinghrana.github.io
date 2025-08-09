import { getCurrentMoonData } from "@utils/currentMoonData";
import type MoonEvent from "./moonEvents/MoonEvent";

import moonPhaseFacts from "@utils/moonPhaseFacts";
import getRandomFact from "@utils/constellation/randomFactGenerator";

// function getFileNameFromDate() {
//   const dateToday = new Date();
//   const monthText = dateToday.toLocaleString("default", { month: "short" });
//   const year = dateToday.getFullYear();

//   const fileName = monthText + year;
//   return fileName;
// }

function moonEventDomSelectors() {
  const moonEventPrefix = document.getElementById("moonEventPrefix");
  const moonEventEvent = document.getElementById("moonEventEvent");
  const moonEventDate = document.getElementById("moonEventDate");

  return {
    moonEventPrefix,
    moonEventEvent,
    moonEventDate,
  };
}

// async function getFactsFromFile(path): Promise<MoonEvent[]> {
//   const file = await import(path);
//   const facts: MoonEvent[] = file.default || [];

//   console.log("Successfully imported", { file, facts });
//   return facts;
// }

// async function fillMoonEvent() {
//   const { moonEventPrefix, moonEventEvent, moonEventDate } =
//     moonEventDomSelectors();
//   const fileName = getFileNameFromDate();

//   const facts = await getFactsFromFile(`./moonEvents/${fileName}.ts`).catch(
//     () => {
//       return getFactsFromFile(`./moonEvents/${fileName}.js`).catch(() => []);
//     },
//   );

//   console.log("fillMoonEvent", { fileName, facts });
// }

// fillMoonEvent();

function fillMoonEventWithRandomFact() {
  const { moonEventPrefix, moonEventEvent, moonEventDate } =
    moonEventDomSelectors();

  moonEventPrefix.innerText = "";
  moonEventDate.innerText = "";

  const randomFAct = getRandomFact();

  console.log("randomFAct", randomFAct);

  moonEventEvent.innerText = randomFAct;
}

function fillMoonEventWithMoonPhaseFact() {
  const lunarAgePercentOG = parseFloat(
    getCurrentMoonData().lunarAgePercent?.replace("%", "") || "0",
  );

  const { moonEventPrefix, moonEventEvent, moonEventDate } =
    moonEventDomSelectors();

  moonEventPrefix.innerText = "";
  moonEventDate.innerText = "";
  if (lunarAgePercentOG > 96 && lunarAgePercentOG < 4) {
    moonEventEvent.innerText = moonPhaseFacts.newMoon;
    return true;
  }
  if (lunarAgePercentOG > 47 && lunarAgePercentOG < 54) {
    moonEventEvent.innerText = moonPhaseFacts.fullMoon;
    return true;
  }
  if (
    (lunarAgePercentOG > 22 && lunarAgePercentOG < 27) ||
    (lunarAgePercentOG > 72 && lunarAgePercentOG < 77)
  ) {
    moonEventEvent.innerText = moonPhaseFacts.quarterPhase;
    return true;
  }

  if (lunarAgePercentOG > 12 && lunarAgePercentOG < 16) {
    moonEventEvent.innerText = moonPhaseFacts.waxingCrescent;
    return true;
  }

  if (lunarAgePercentOG > 34 && lunarAgePercentOG < 37) {
    moonEventEvent.innerText = moonPhaseFacts.waxingGibbous;
    return true;
  }

  if (lunarAgePercentOG > 60 && lunarAgePercentOG < 64) {
    moonEventEvent.innerText = moonPhaseFacts.waningGibbous;
    return true;
  }

  if (lunarAgePercentOG > 86 && lunarAgePercentOG < 90) {
    moonEventEvent.innerText = moonPhaseFacts.waningCrescent;
    return true;
  }
}

function mainFiller() {
  if (fillMoonEventWithMoonPhaseFact()) return;
  if (fillMoonEventWithRandomFact()) return;
}

mainFiller();
