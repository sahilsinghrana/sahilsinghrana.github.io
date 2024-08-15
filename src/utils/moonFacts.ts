class MoonFact {
  fact = "";
  reference = "";
  description = "";
  descriptionRef = "";
  constructor(
    fact: string,
    reference: string | undefined = "",
    description: string | undefined = "",
    descriptionRef: string | undefined = "",
  ) {
    this.fact = fact;
    this.reference = reference;
    this.description = description;
    this.descriptionRef = descriptionRef;
  }
}

const moonFacts = {
  drifting: new MoonFact(
    "The Moon is drifting away from the Earth.",
    "https://public.nrao.edu/ask/what-happens-as-the-moon-moves-away-from-the-earth/#:~:text=Laser%20ranging%20measurements%20of%20the%20change%20in%20the%20distance%20from%20the%20Earth%20to%20the%20Moon%20tell%20us%20that%20the%20Moon%20is%20moving%20away%20from%20the%20Earth%20at%20a%20rate%20of%20about%203.78%20cm%20per%20year.%C2%A0",
    "It’s driven by the effect of the Moon’s gravity on the rotating Earth. Tides raised in the oceans cause drag and thus slow the Earth’s spin-rate. The resulting loss of angular momentum is compensated for by the Moon speeding up, and thus moving further away.",
    "https://www.sciencefocus.com/space/why-is-the-moon-moving-away-from-us#:~:text=It%E2%80%99s%20driven%20by%20the%20effect%20of%20the%20Moon%E2%80%99s%20gravity%20on%20the%20rotating%20Earth.%20Tides%20raised%20in%20the%20oceans%20cause%20drag%20and%20thus%20slow%20the%20Earth%E2%80%99s%20spin%2Drate.%20The%20resulting%20loss%20of%20angular%20momentum%20is%20compensated%20for%20by%20the%20Moon%20speeding%20up%2C%20and%20thus%20moving%20further%20away.",
  ),
  farSideTerrain: new MoonFact(
    "The far side of the Moon has a vastly different terrain compared to the near side, with a thicker crust and more craters.",
    "https://en.wikipedia.org/wiki/Far_side_of_the_Moon#:~:text=The%20far%20side%20has%20more,as%20seen%20from%20the%20Moon.",
    "This was thought to be a result of the effects of lunar lava flows, which cover and obscure craters, rather than a shielding effect from the Earth. NASA calculates that the Earth obscures only about 4 square degrees out of 41,000 square degrees of the sky as seen from the Moon. 'This makes the Earth negligible as a shield for the Moon [and] it is likely that each side of the Moon has received equal numbers of impacts, but the resurfacing by lava results in fewer craters visible on the near side than the far side, even though both sides have received the same number of impacts.'",
  ),
  makesEarthMoveAndTides: new MoonFact(
    "The Moon makes the Earth move as well as the tides.",
    "https://science.nasa.gov/resource/tides/#:~:text=The%20Moon%E2%80%99s%20gravitational%20pull%20on%20Earth%2C%20combined%20with%20other%2C%20tangential%20forces%2C%20causes%20Earth%E2%80%99s%20water%20to%20be%20redistributed%2C%20ultimately%20creating%20bulges%20of%20water%20on%20the%20side%20closest%20to%20the%20Moon%20and%20the%20side%20farthest%20from%20the%20Moon.",
    "The Moon’s gravitational pull on Earth, combined with other, tangential forces, causes Earth’s water to be redistributed, ultimately creating bulges of water on the side closest to the Moon and the side farthest from the Moon.",
  ),
  slowingEarthRotation: new MoonFact(
    "The Moon is gradually slowing down Earth's rotation.",
    "https://www.discovermagazine.com/planet-earth/the-earths-rotation-is-gradually-slowing-down#:~:text=Earth%27s%20Rotation%20Has%20Slowed%20Down%20Over%20Billions%20of%20Years",
    "Scientists still don’t fully understand all the factors that contribute to changes in the Earth’s rotation. But the advent of extremely sensitive instruments for measuring data and keeping time have allowed them to track variations in our planet’s spin down to the microsecond. The effort has revealed that Earth’s rotation is in constant, microscopic flux. Each day is different than the last.",
  ),
  noMoonsOfMoon: new MoonFact(
    "Earth's Moon has no moons of its own.",
    "https://www.newscientist.com/question/many-moons-earth/#:~:text=The%20simple%20answer%20is%20that%20Earth%20has%20only%20one%20moon%2C%20which%20we%20call%20%E2%80%9Cthe%20moon%E2%80%9D",
    "It is the largest and brightest object in the night sky, and the only solar system body besides Earth that humans have visited in our space exploration efforts.",
  ),
  largerAtHorizon: new MoonFact(
    "The Moon appears larger near the horizon, but this is an optical illusion.",
    "https://science.nasa.gov/solar-system/moon/the-moon-illusion-why-does-the-moon-look-so-big-sometimes/",
    "The Moon illusion is the name for this trick our brains play on us. Photographs prove that the Moon is the same width near the horizon as when it's high in the sky, but that's not what we perceive with our eyes. Thus it's an illusion rooted in the way our brains process visual information",
  ),
  darkSurface: new MoonFact(
    "There is dark side of the moon and sometimes it's not all dark.",
    "https://www.scientificamerican.com/article/earthshine-lights-up-the-dark-side-of-the-moon/#:~:text=there%20is%20a%20dark%20side%20of%20the%20moon.%20And%20sometimes%20it%E2%80%99s%20not%20all%20that%20dark.",
    "Where the sun shines on the lunar surface, it’s daytime, and where it’s dark, it’s nighttime.",
  ),
  maria: new MoonFact(
    "The dark, smooth areas on the Moon are called maria, which are ancient lava flows.",
    "https://www.skyatnightmagazine.com/space-science/lunar-maria-guide-list-seas-moon#:~:text=Lunar%20maria%20are%20the%20dark%20topographical%20features%20that%20can%20be%20observed%20on%20the%20lunar%20surface%2C%20covering%20about%2015%25%20of%20the%20Moon%27s%20crust%2C%20and%20which%20have%20dazzled%20astronomers%20and%20moon%2Dgazers%20for%20centuries.",
    "The lunar maria are impact basins created by collisions with cosmic debris that filled with lava and other lunar material between 1-4 billion years ago.",
  ),
  moonQuakes: new MoonFact(
    "The Moon has quakes too.",
    "https://www.discovermagazine.com/the-sciences/what-are-moonquakes-the-causes-and-different-types#:~:text=The%20surface%20of%20the%20moon%20is%20scattered%20with%20craters%20from%20meteorite%20collisions.%20These%20collisions%20are%20one%20of%20the%20four%20main%20causes%20of%20a%20type%20of%20seismic%20tremor%20called%20a%20%22moonquakes.%22",
    "The surface of the moon is scattered with craters from meteorite collisions. These collisions are one of the four main causes of a type of seismic tremor called a 'moonquakes.'",
  ),
  heavilyCratered: new MoonFact(
    "The Moon's surface is heavily cratered due to its lack of atmosphere to protect it from impacts.",
    "https://nss.org/settlement/nasa/spaceresvol4/human.html#:~:text=Its%20upper%20surface,and%20unmanned%20activities.",
    "The bulk density of lunar regolith increases with depth. Its upper surface is believed to have 45-percent porosity. The porous upper 20 cm of the regolith results from repeated meteoroid impacts, which stir up the exposed surface and occasionally form large craters. These meteoroids represent potential hazards to both manned and unmanned activities.",
  ),
  makingOfMoon: new MoonFact(
    "The Moon was made when a rock smashed into Earth",
    "https://science.nasa.gov/moon/formation/#:~:text=Earth%E2%80%99s%20Moon%20is%20thought%20to%20have%20formed%20in%20a%20tremendous%20collision.%20A%20massive%20object%20%E2%80%95%20named%20Theia%20after%20the%20mythological%20Greek%20Titan%20who%20was%20the%20mother%20of%20Selene%2C%20goddess%20of%20the%20Moon%20%E2%80%95%20smashed%20into%20Earth%2C%20flinging%20material%20into%20space%20that%20became%20the%20Moon.",
    "Earth’s Moon is thought to have formed in a tremendous collision. A massive object ― named Theia after the mythological Greek Titan who was the mother of Selene, goddess of the Moon ― smashed into Earth, flinging material into space that became the Moon.",
  ),
  lunarCycleInfluence: new MoonFact(
    "Many living organisms, including humans, have biological rhythms influenced by lunar cycles.",
    "https://www.nhm.ac.uk/discover/how-does-the-moon-affect-life-on-earth.html#:~:text=properties%20of%20moonlight.-,On%20the%20lunar%20clock,-It%27s%20possible%20you%27ve",
    "Circalunar rhythms are tied to lunar cycles. They are very difficult to discern, but they have effects on different types of organisms,' says Tom. 'Some animals will respond to both a circadian rhythm and a lunar clock.",
  ),
  darkSide: new MoonFact(
    "The 'dark side' of the Moon receives sunlight, it's just the side we can't see from Earth.",
    "https://www.spacecentre.co.uk/news/space-now-blog/the-dark-side-of-the-moon/#:~:text=The%20%E2%80%98dark%20side%E2%80%99%20of%20the%20Moon%20refers%20to%20the%20hemisphere%20of%20the%20Moon%20that%20is%20facing%20away%20from%20the%20Earth.%20In%20reality%20it%20is%20no%20darker%20than%20any%20other%20part%20of%20the%20Moon%E2%80%99s%20surface%20as%20sunlight%20does%20in%20fact%20fall%20equally%20on%20all%20sides%20of%20the%20Moon.%20It%20is%20only%20%E2%80%98dark%E2%80%99%20to%20us%2C",
    "The ‘dark side’ of the Moon refers to the hemisphere of the Moon that is facing away from the Earth. In reality it is no darker than any other part of the Moon’s surface as sunlight does in fact fall equally on all sides of the Moon. It is only ‘dark’ to us, as that hemisphere can never be viewed from Earth due to a phenomenon known as ‘Tidal Locking’.",
  ),
};

export default moonFacts;
