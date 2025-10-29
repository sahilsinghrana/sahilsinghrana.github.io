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
    "No one can ever remain without performing action even for a moment; for everyone is helplessly driven to action by the qualities born of nature..",
  ),
  new Shloka(
    3.21,
    "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः ।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते ॥",
    "Whatever action a great man performs, common men follow. Whatever standards he sets by exemplary acts, all the world pursues.",
  ),
  new Shloka(
    2.16,
    "नासतो विद्यते भावो नाभावो विद्यते सतः ।\nउभयोरपि दृष्टोऽन्तस्त्वनयोस्तत्त्वदर्शिभिः ॥",
    "The unreal never comes into existence, and the Real never ceases to be. The ultimate truth about both these has been perceived by the seers of the Truth.",
  ),
  new Shloka(
    2.63,
    "क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः ।\nस्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति ॥",
    "From anger comes delusion; from delusion, the bewilderment of memory; when memory is bewildered, intelligence is lost; and when intelligence is lost, one falls down again into the material pool.",
  ),
  new Shloka(
    6.5,
    "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥",
    "One must uplift oneself by one's own self (mind), and should not degrade oneself. For the mind (self) alone is one's friend, and the mind (self) alone is one's enemy.",
  ),
  new Shloka(
    12.13,
    "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च ।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी ॥",
    "One who is not envious of any living entity, who is friendly and compassionate, who is free from the sense of proprietorship and false ego, who is equal in both happiness and distress, and who is always forgiving, he is very dear to Me.",
  ),
  new Shloka(
    5.1,
    "ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः। लिप्यते न स पापेन पद्मपत्रमिवाम्भसा॥",
    "One who performs his duty without attachment, surrendering the results to the Supreme, is untouched by sin, just as a lotus leaf is untouched by water",
  ),
  new Shloka(
    18.9,
    "कार्यमित्येव यत्कर्म नियतं क्रियतेऽर्जुन। सङ्गं त्यक्त्वा फलं चैव स त्यागः सात्त्विको मतः॥",
    "When prescribed duty is performed simply because it is a duty, giving up attachment and the result, that renunciation is considered to be in the mode of goodness (Sattva).",
  ),
  new Shloka(
    18.17,
    "यस्य नाहङ्कृतो भावो बुद्धिर्यस्य न लिप्यते। हत्वापि स इमाँल्लोकान्न हन्ति न निबध्यते॥",
    "One who is free from the egoistic notion (that 'I am the doer') and whose intellect is not tainted, even if he slays these living beings, he neither slays nor is he bound by the action.",
  ),
  new Shloka(
    17.2,
    "दातव्यमिति यद्दानं दीयतेऽनुपकारिणे। देशे काले च पात्रे च तद्दानं सात्त्विकं स्मृतम्॥",
    "That charity which is given as a matter of duty, without expectation of return, in the proper place, at the proper time, and to a worthy person, is considered to be Sattvic.",
  ),
  new Shloka(
    17.3,
    "सत्त्वानुरूपा सर्वस्य श्रद्धा भवति भारत। श्रद्धामयोऽयं पुरुषो यो यच्छ्रद्धः स एव सः॥",
    "The faith of every person, O Arjuna, is in accordance with their inner nature. A person is made of his faith; whatever his faith is, that verily he is.",
  ),
];

export const getRandomShloka = (): Shloka => {
  const cnt = Number(sessionStorage.getItem("sh0DnCt") || 0);
  if (cnt > 4) {
    sessionStorage.setItem("sh0DnCt", "0");
    sessionStorage.removeItem("sh0Dn");
  } else {
    sessionStorage.setItem("sh0DnCt", (cnt + 1).toString());
  }

  let idx = 0;
  const zDone = sessionStorage.getItem("sh0Dn");
  if (zDone) {
    idx = getRandom(0, BHAGAVAD_GITA_SHLOKAS.length - 1, 1);
  } else {
    sessionStorage.setItem("sh0Dn", "true");
  }

  return BHAGAVAD_GITA_SHLOKAS[idx];
};
