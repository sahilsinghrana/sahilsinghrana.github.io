import { LunarPhase } from "lunarphase-js";

import { getCurrentMoonPhase } from "./moonData";

import NewMoonImage from "@assets/images/moonPhases/0newMoon.webp";
import WazingCrescentImage from "@assets/images/moonPhases/1waxingCrescent.webp";
import FirstQuarterImage from "@assets/images/moonPhases/2firstQuarter.webp";
import WaxingGibbousImage from "@assets/images/moonPhases/3waxingGibbous.webp";
import FullMoonImage from "@assets/images/moonPhases/4fullMoon.webp";
import WaningGibbousImage from "@assets/images/moonPhases/5waningGibbous.webp";
import LastQuarterImage from "@assets/images/moonPhases/6lastQuarter.webp";
import WaningCrescentImage from "@assets/images/moonPhases/7waningCrescent.webp";

export function getCurrentMoonPhaseImage() {
  // const currentPhase = LunarPhase.WAXING_CRESCENT;
  const currentPhase = getCurrentMoonPhase();

  let image;

  switch (currentPhase) {
    case LunarPhase.FULL:
      image = FullMoonImage;
      break;
    case LunarPhase.NEW:
      image = NewMoonImage;
      break;
    case LunarPhase.WAXING_CRESCENT:
      image = WazingCrescentImage;
      break;
    case LunarPhase.FIRST_QUARTER:
      image = FirstQuarterImage;
      break;
    case LunarPhase.WAXING_GIBBOUS:
      image = WaxingGibbousImage;
      break;
    case LunarPhase.WANING_GIBBOUS:
      image = WaningGibbousImage;
      break;
    case LunarPhase.LAST_QUARTER:
      image = LastQuarterImage;
      break;
    case LunarPhase.WANING_CRESCENT:
      image = WaningCrescentImage;
      break;
    default:
      image = NewMoonImage;
      break;
  }

  return {
    image,
    currentPhase,
    LunarPhases: LunarPhase,
  };
}
