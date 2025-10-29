import { getRandom } from "@components/Spotify/helpers/utils";

interface Links {
  home: string;
  about: string;
  contact: string;
  projects: string;
  blog: string;
  resources: string;
  github: string;
  linkedin: string;
  profilePic: string;
  instagram: string;
  twitter: string;
  mail: string;
}
export const links: Links = {
  home: "/",
  about: "/about",
  contact: "/contact",
  projects: "/projects",
  blog: "/blog",
  resources: "/resources",
  github: "http://github.com/sahilsinghrana",
  linkedin: "https://www.linkedin.com/in/sahilsinghrana",
  profilePic: "https://avatars.githubusercontent.com/u/48375250?v=4",
  instagram: "https://instagram.com/sahilrana0_0",
  twitter: "https://x.com/sahilrana010",
  mail: "mailto:ranasahil98@gmail.com",
};

interface ApiUrls {
  topSpotifySongsAndTracks: string;
  currentPlayerStatus: string;
}
export const API_URLS: ApiUrls = {
  topSpotifySongsAndTracks: "https://mytopsongs.sahilsinghrana.workers.dev/",
  currentPlayerStatus:
    "https://mytopsongs.sahilsinghrana.workers.dev/currentPlaying",
};

export const SAGITTARIUS = {
  stars: {
    Ascella: "Ascella", //done
    Alnasl: "Alnasl", //done
    Albaldah: "Albaldah", // done
    ArkabPrior: "Arkab Prior", //done
    ArkabPosterior: "Arkab Posterior", // done
    KausAustralis: "Kaus Australis", // done
    KausMedia: "Kaus Media", // done
    KausBorealis: "Kaus Borealis", // done
    Nunki: "Nunki", // done
    // Polis: "Polis",
    // RhoSagittarii: "Rho Sagittarii",
    // TauSagittarii: "Tau Sagittarii",
    // Terebellum: "Terebellum",
  },
};

class Shloka {
  constructor(
    public chapter: number,
    public text: string,
    public translation: string,
  ) {
    this.chapter = chapter;
    this.text = text;
    this.translation = translation;
  }
}

export const BHAGAVAD_GITA_SHLOKAS: Shloka[] = [
  new Shloka(
    2.47,
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥",
    "You have the right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results of your activities, nor be attached to inaction.",
  ),
  new Shloka(
    3.5,
    "न हि कश्चित् क्षणमपि जातु तिष्ठत्यकर्मकृत् ।\nकार्यते ह्यवशः कर्म सर्वः प्रकृतिजैर्गुणैः ॥",
    "All men are forced to act helplessly according to the impulses of nature's modes; therefore, no one can remain absolutely inactive even for a moment.",
  ),
  new Shloka(
    3.21,
    "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः ।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते ॥",
    "Whatever action a great man performs, common men follow. Whatever standards he sets by exemplary acts, all the world pursues.",
  ),
  new Shloka(
    2.16,
    "नासतो विद्यते भावो नाभावो विद्यते सतः ।\nउभयोरपि दृष्टोऽन्तस्त्वनयोस्तत्त्वदर्शिभिः ॥",
    "Of the transient (non-existent) there is no endurance, and of the eternal (existent) there is no cessation. The distinction between these two has been perceived by the seers of truth.",
  ),
  new Shloka(
    2.63,
    "क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः ।\nस्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति ॥",
    "From anger comes delusion; from delusion, the bewilderment of memory; when memory is bewildered, intelligence is lost; and when intelligence is lost, one falls down again into the material pool.",
  ),
  new Shloka(
    6.5,
    "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥",
    "One must elevate himself by his own mind, and not degrade himself. The mind is the friend of the conditioned soul, and his enemy as well.",
  ),
  new Shloka(
    12.13,
    "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च ।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी ॥",
    "One who is not envious of any living entity, who is friendly and compassionate, who is free from the sense of proprietorship and false ego, who is equal in both happiness and distress, and who is always forgiving, he is very dear to Me.",
  ),
];

export const getRandomShloka = (): Shloka => {
  return BHAGAVAD_GITA_SHLOKAS[
    getRandom(0, BHAGAVAD_GITA_SHLOKAS.length - 1, 1)
  ];
};
