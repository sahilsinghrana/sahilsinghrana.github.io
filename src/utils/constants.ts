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
  imageUrl?: string;
  source?: string;

  constructor(
    public chapter: number | string,
    public text: string,
    public translation: string,
  ) {
    this.chapter = chapter;
    this.text = text;
    this.translation = translation;
  }
}

class BG_Shloka extends Shloka {
  constructor(
    public chapter: number,
    public text: string,
    public translation: string,
  ) {
    super(chapter, text, translation);
    this.source = "Bhagavad Gita";
    this.imageUrl = "";
  }
}

class SHIVA_Shloka extends Shloka {
  constructor(
    public chapter: number | string,
    public text: string,
    public translation: string,
    public source: string,
  ) {
    super(chapter, text, translation);
    this.source = source || "Shiva";
    this.imageUrl = "";
  }
}

export const BHAGAVAD_GITA_SHLOKAS: Shloka[] = [
  new BG_Shloka(
    3.8,
    "नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः। \n शरीरयात्रापि च ते न प्रसिद्ध्येदकर्मणः॥",
    "Perform your bound duty. Action is better than inaction; without action, even the maintenance of your body is impossible.",
  ),

  new BG_Shloka(
    2.47,
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥",
    "You have the right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results of your activities, nor be attached to inaction.",
  ),
  new BG_Shloka(
    3.5,
    "न हि कश्चित् क्षणमपि जातु तिष्ठत्यकर्मकृत् ।\nकार्यते ह्यवशः कर्म सर्वः प्रकृतिजैर्गुणैः ॥",
    "No one can ever remain without performing action even for a moment; for everyone is helplessly driven to action by the qualities born of nature..",
  ),
  new BG_Shloka(
    2.16,
    "नासतो विद्यते भावो नाभावो विद्यते सतः ।\nउभयोरपि दृष्टोऽन्तस्त्वनयोस्तत्त्वदर्शिभिः ॥",
    "The unreal never comes into existence, and the Real never ceases to be. The ultimate truth about both these has been perceived by the seers of the Truth.",
  ),
  new BG_Shloka(
    2.63,
    "क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः ।\nस्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति ॥",
    "From anger comes delusion; from delusion, the bewilderment of memory; when memory is bewildered, intelligence is lost; and when intelligence is lost, one falls down again into the material pool.",
  ),
  new BG_Shloka(
    6.5,
    "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥",
    "One must uplift oneself by one's own self (mind), and should not degrade oneself. For the mind (self) alone is one's friend, and the mind (self) alone is one's enemy.",
  ),
  new BG_Shloka(
    12.13,
    "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च ।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी ॥",
    "One who is not envious of any living entity, who is friendly and compassionate, who is free from the sense of proprietorship and false ego, who is equal in both happiness and distress, and who is always forgiving, he is very dear to Me.",
  ),
  new BG_Shloka(
    5.1,
    "ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः। लिप्यते न स पापेन पद्मपत्रमिवाम्भसा॥",
    "One who performs his duty without attachment, surrendering the results to the Supreme, is untouched by sin, just as a lotus leaf is untouched by water",
  ),
  new BG_Shloka(
    18.17,
    "यस्य नाहङ्कृतो भावो बुद्धिर्यस्य न लिप्यते। हत्वापि स इमाँल्लोकान्न हन्ति न निबध्यते॥",
    "One who is free from the egoistic notion (that 'I am the doer') and whose intellect is not tainted, even if he slays these living beings, he neither slays nor is he bound by the action.",
  ),
  new BG_Shloka(
    17.3,
    "सत्त्वानुरूपा सर्वस्य श्रद्धा भवति भारत। श्रद्धामयोऽयं पुरुषो यो यच्छ्रद्धः स एव सः॥",
    "The faith of every person, O Arjuna, is in accordance with their inner nature. A person is made of his faith; whatever his faith is, that verily he is.",
  ),
];

export const SHIVA_SHLOKAS: Shloka[] = [
  new SHIVA_Shloka(
    "Canto 3",
    "तपःशक्त्या शरीरं निःसारं कृतवान् हरः । \n कामोऽभवन्मनो यस्य तस्य नास्ति पराजयः ॥",
    "By the power of austerity, Hara made his body beyond material attraction. For whom desire itself becomes the mind, there can be no defeat.",
    "Kumārasambhavam",
  ),
  new SHIVA_Shloka(
    "18",
    "न मे देहसुखे रागो न लोके नामहेषणा । \nn यः सुखं ब्रह्मरूपं तत्सुखं मम शाश्वतम् ॥",
    "I have no attachment to bodily pleasure nor to worldly fame; my bliss lies in the Brahmic self;  that alone is eternal.",
    "Śiva Purāṇa, Rudra Saṁhitā",
  ),
  new SHIVA_Shloka(
    "2",
    "नित्यं संन्यस्तभावोऽसौ नित्यवैराग्यधर्मवान् । \n स एव शक्त्या सायुज्यं प्राप साक्षात्परं शिवः ॥",
    "Ever detached in nature, embodying the eternal law of renunciation, He, united with Śakti, became the supreme Śiva.",
    "Skanda Purāṇa, Uma-Māhātmya",
  ),
  new SHIVA_Shloka(
    "",
    "वैराग्यमेव तेजोऽस्य न तु हठयोगसाधनम् । \nयेन कामोऽपि दग्धः स्यात् तं वन्दे योगिनां पतिम् ॥",
    "His brilliance is his vairāgya, not forceful discipline; He who burnt even Desire; I bow to that Lord of Yogis.",
    "Bṛhaspati Smriti",
  ),
  new SHIVA_Shloka(
    7.104,
    "उत्साहो बलवानार्यं नास्त्युत्साहात्परं बलम्। \n सोत्साहस्य हि लोकेषु न किञ्चिदपि दुर्लभम्॥",
    "Enthusiasm is power itself; there is no strength greater than zeal. To one who acts with enthusiasm, nothing is truly difficult.",
    "Manusmṛti",
  ),

  new SHIVA_Shloka(
    177.25,
    "उत्साहाद्यत्र सिद्ध्यन्ति कार्याणि न विपश्चितः। \n न तत्र शास्त्रं न बुद्धिर्न दक्षता न चौषधम्॥",
    "Where zeal prevails, tasks succeed — not by scriptural learning, intellect, skill, or even medicine.",
    "Mahābhārata, Śānti Parva",
  ),
];

const ALL_SHLOKAS: Shloka[] = [...SHIVA_SHLOKAS, ...BHAGAVAD_GITA_SHLOKAS];

export const getRandomShloka = (): Shloka => {
  const cnt = Number(sessionStorage.getItem("sh0DnCt") || 0);
  if (cnt > 8) {
    sessionStorage.setItem("sh0DnCt", "0");
    sessionStorage.removeItem("sh0Dn");
  } else {
    sessionStorage.setItem("sh0DnCt", (cnt + 1).toString());
  }

  let idx = 0;
  const zDone = sessionStorage.getItem("sh0Dn");
  if (zDone) {
    idx = getRandomShlokaIndex();
  } else {
    sessionStorage.setItem("sh0Dn", "true");
  }

  sessionStorage.setItem("lsShlIx", idx.toString());
  return ALL_SHLOKAS[idx];
};

const getRandomShlokaIndex = (): number => {
  const lastIdx = sessionStorage.getItem("lsShlIx");
  let idx = getRandom(0, ALL_SHLOKAS.length - 1, 1);

  while (lastIdx && String(idx) === lastIdx) {
    idx = getRandom(0, ALL_SHLOKAS.length - 1, 1);
  }
  return idx;
};
