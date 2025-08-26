import Fact from "@utils/Fact";

const miscFacts: Fact[] = [
  new Fact(
    "Mars has two moons: Phobos and Deimos.",
    "https://science.nasa.gov/mars/moons/",
    "Phobos and Deimos are small, irregular moons likely captured or accreted debris; Phobos orbits very close and is slowly spiraling inward.",
    "https://science.nasa.gov/mars/moons/deimos/",
  ),

  new Fact(
    "Seasonal changes on Mars are strongly affected by its orbital eccentricity.",
    "https://science.nasa.gov/resource/seasons-in-the-martian-year-as-the-red-planet-orbits-the-sun/",
    "Mars' larger orbital eccentricity combined with its axial tilt produces uneven season lengths and stronger southern hemisphere summers when near perihelion.",
    "https://sci.esa.int/web/home/-/30214-the-seasons-on-mars",
  ),

  new Fact(
    "Saturn has 274 confirmed natural moons (updated via 2025 surveys).",
    "https://science.nasa.gov/saturn/moons/",
    "Recent surveys announced in 2024–2025 added many small satellites; counts are observational and may increase with deeper surveys.",
    "https://www.nature.com/articles/d41586-025-00781-1",
  ),

  new Fact(
    "Saturn's rings are composed primarily of water ice with minor rock and dust.",
    "https://science.nasa.gov/mission/cassini/science/rings/",
    "Cassini observations show ring particles range from micrometre grains to kilometre-scale chunks and are dominated by water ice with some contamination.",
    "https://en.wikipedia.org/wiki/Rings_of_Saturn",
  ),

  new Fact(
    "When two planets appear close together from Earth it's a planetary conjunction (apparent alignment).",
    "https://science.nasa.gov/solar-system/skywatching/planetary-alignments-and-planet-parades/",
    "A conjunction is an observational, line-of-sight phenomenon — the bodies remain widely separated in space despite appearing near each other in the sky.",
    "https://en.wikipedia.org/wiki/Conjunction_(astronomy)",
  ),

  new Fact(
    "Aries lies along the ecliptic in the northern celestial hemisphere; Scorpius appears largely southern.",
    "https://www.britannica.com/place/Aries-constellation",
    "Aries is a zodiacal constellation found between Pisces and Taurus; Scorpius is low or southern from many northern latitudes and does not share Aries' sky region.",
    "https://www.britannica.com/place/Scorpius-constellation",
  ),

  new Fact(
    "Leo is relatively compact with several bright stars; Virgo is much larger and overall fainter to the naked eye.",
    "https://www.britannica.com/place/Leo-constellation",
    "Leo contains bright stars like Regulus and is easier to spot; Virgo spans a larger sky area and is dominated by fainter stars such as Spica.",
    "https://www.britannica.com/place/Virgo",
  ),

  new Fact(
    "Jupiter is the largest planet; the Great Red Spot is a long-lived storm historically larger than Earth but shrinking in recent decades.",
    "https://science.nasa.gov/science-research/planetary-science/15may_grs/",
    "The Great Red Spot is an anticyclonic storm; imagery from Hubble and Juno show it has decreased in diameter over time but remains massive.",
    "https://www.jpl.nasa.gov/images/pia26076-cylindrical-orientation-of-jupiters-east-west-jet-streams/",
  ),

  new Fact(
    "Mercury has an unusually large metallic core (model-dependent: roughly ~75–85% of radius in many estimates).",
    "https://science.nasa.gov/mercury/facts/",
    "MESSENGER and subsequent modeling show Mercury's iron-rich core occupies a very large fraction of its radius; exact fraction varies by model and assumptions.",
    "https://messenger.jhuapl.edu/About/Why-Mercury.html",
  ),

  new Fact(
    "The Sun's energy is produced by nuclear fusion via the proton–proton chain.",
    "https://www.britannica.com/science/proton-proton-cycle",
    "In the Sun's core hydrogen nuclei fuse into helium through the proton–proton chain, releasing the energy that powers the Sun.",
    "https://en.wikipedia.org/wiki/Proton%E2%80%93proton_chain",
  ),

  new Fact(
    "Neptune has the highest measured sustained wind speeds in the Solar System (region- and epoch-dependent; supersonic values reported).",
    "https://science.nasa.gov/neptune/",
    "Voyager 2 and later observations record winds exceeding ~1,200 mph (≈2,000 km/h) in parts of Neptune's atmosphere; values vary by measurement.",
    "https://spacecenter.org/meet-our-solar-system-neptune/",
  ),

  new Fact(
    "Uranus's ~98° axial tilt is explained by competing hypotheses (giant impacts vs. satellite-driven mechanisms).",
    "https://www.aanda.org/articles/aa/full_html/2022/12/aa43953-22/aa43953-22.html",
    "Leading explanations include one or more large early impacts and more recent models where migrating satellites torque the planet to high obliquity.",
    "https://www.sciencedirect.com/science/article/pii/S0019103521004851",
  ),

  new Fact(
    "51 Pegasi b (announced 1995) was the first confirmed exoplanet around a Sun-like main-sequence star.",
    "https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/",
    "The 1995 detection of 51 Pegasi b marked the start of the modern exoplanet era and led to the discovery of many 'hot Jupiters'.",
    "https://en.wikipedia.org/wiki/51_Pegasi_b",
  ),

  new Fact(
    "Pluto was reclassified as a 'dwarf planet' by the IAU in 2006.",
    "https://science.nasa.gov/dwarf-planets/pluto/facts/",
    "The IAU's 2006 definition requires orbiting the Sun, sufficient mass for a nearly round shape, and 'clearing the neighborhood' — Pluto fails the last criterion.",
    "https://www.britannica.com/story/why-is-pluto-no-longer-a-planet",
  ),

  new Fact(
    "The Milky Way is estimated to contain roughly 100–400 billion stars.",
    "https://science.nasa.gov/universe/exoplanets/our-milky-way-galaxy-how-big-is-space/",
    "Star-count estimates vary with method (stellar surveys, mass modeling); current consensus range is about 100–400 billion stars.",
    "https://en.wikipedia.org/wiki/Milky_Way",
  ),

  new Fact(
    "Jupiter's banded appearance arises from alternating east–west jet streams (belts and zones).",
    "https://science.nasa.gov/image-detail/amf-pia24964/",
    "Belts and zones are produced by strong east-west jet streams; differences in cloud opacity/composition create visible light/dark bands.",
    "https://www.jpl.nasa.gov/images/pia26076-cylindrical-orientation-of-jupiters-east-west-jet-streams/",
  ),
  new Fact(
    "The Panchang (Hindu almanac) is built on astronomical measures (tithi, nakshatra, yoga, karana, vara) — all derived from Sun/Moon/planet positions computed astronomically.",
    "https://www.britannica.com/topic/Hindu-calendar",
    "Panchang components are calculable from ephemerides: lunar day (tithi), lunar mansion (nakshatra), yoga (Sun+Moon angle), karana (half-tithi), and weekday (vara) — they are astronomical constructs used in traditional timing.",
    "https://en.wikipedia.org/wiki/Hindu_calendar",
  ),
];

export default miscFacts;
