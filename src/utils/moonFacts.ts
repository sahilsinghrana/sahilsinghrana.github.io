class MoonFact {
  fact = "";
  reference = "";
  constructor(fact: string, reference: string | undefined = "") {
    this.fact = fact;
    this.reference = reference;
  }
}

const moonFacts = {
  drifting: new MoonFact("The Moon is drifting away from the Earth"),
  farSideTerrain: new MoonFact(
    "The far side of the Moon has a vastly different terrain compared to the near side, with a thicker crust and more craters.",
  ),
  makesEarthMoveAndTides: new MoonFact(
    "The Moon makes the Earth move as well as the tides",
  ),
  slowingEarthRotation: new MoonFact(
    "The Moon is gradually slowing down Earth's rotation.",
  ),
  noMoonsOfMoon: new MoonFact("Earth's Moon has no moons of its own."),
  largerAtHorizon: new MoonFact(
    "The Moon appears larger near the horizon, but this is an optical illusion.",
  ),
  darkSurface: new MoonFact("The Moon’s surface is actually dark"),
  maria: new MoonFact(
    "The dark, smooth areas on the Moon are called maria, which are ancient lava flows.",
  ),
  moonQuakes: new MoonFact("The Moon has quakes too"),
  heavilyCratered: new MoonFact(
    "The Moon's surface is heavily cratered due to its lack of atmosphere to protect it from impacts.",
  ),
  makingOfMoon: new MoonFact(
    "The Moon was made when a rock smashed into Earth",
  ),
  lunarCycleInfluence: new MoonFact(
    "Many living organisms, including humans, have biological rhythms influenced by lunar cycles.",
  ),
  darkSide: new MoonFact(
    "The 'dark side' of the Moon receives sunlight, it's just the side we can't see from Earth.",
  ),
};

export default moonFacts;
