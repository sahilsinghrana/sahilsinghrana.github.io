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
