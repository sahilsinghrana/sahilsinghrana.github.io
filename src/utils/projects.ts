import ExternalLink from "lucide-astro/ExternalLink";
import Facebook from "lucide-astro/Facebook";
import Instagram from "lucide-astro/Instagram";
import Github from "lucide-astro/Github";
import Package from "lucide-astro/Package";
import Youtube from "lucide-astro/Youtube";
import Linkedin from "lucide-astro/Linkedin";

import iwl from "@images/projects/iwl.webp";
import nextChat from "@images/projects/nextchat.webp";
import esp32Car from "@images/projects/esp8266car.webp";
import diziPlayer from "@images/projects/diziPlayer.webp";
import npxNamasteSahil from "@images/projects/npxNamasteSahil.webp";
import TicTacToeVanilla from "@images/projects/TicTacToeVanilla.webp";
import atrij from "@images/projects/atrij.png";
import mobifinLogo from "@images/projects/mobifinLogo.png";
import mobifinTapestryLogo from "@images/projects/mobifin_tapestry_logo.png";
import mynechatLogo from "@images/projects/mynechat.png";
import insiderTradeLogo from "@images/projects/insiderTradeLogo.png";
import fixsyLogo from "@images/projects/fixsyLogo.png";

export const diziPlayerMeta = {
  title: "Dizi Player",
  image: diziPlayer,
  content:
    "Building a Music Player using React as Frontend and Fastify as backend.",
  links: [
    {
      Icon: Github,
      link: "https://github.com/sahilsinghrana/ranexPlayer",
      description: "Github",
    },
    {
      Icon: ExternalLink,
      link: "https://dizi.sahilrana.in",
      description: "Preview",
    },
  ],
};

export const atrijMeta = {
  title: "Atrij",
  image: atrij,
  content:
    "An Astro.js static site by an autonomous AI agent which countinously monitors, generates ideas, reviews them, creates Red Green TDD implementation plan, develops and deploys.",
  links: [
    {
      Icon: Github,
      link: "https://github.com/sahilsinghrana/atrij",
      description: "Github",
    },
    {
      Icon: ExternalLink,
      link: "https://rexx.sahilrana.in",
      description: "Preview",
    },
  ],
};

export const jsonViewerMeta = {
  title: "JSON Viewer and formatter",
  image: "https://jsonviewer.sahilrana.in/jsonviewerscreenshot.png",
  logo: "https://jsonviewer.sahilrana.in/og-image.webp",
  content:
    "Developed a JSON Viewer and formatter with dark mode using React.js.",
  links: [
    {
      Icon: Github,
      link: "https://github.com/sahilsinghrana/jsonviewer",
    },
    {
      Icon: ExternalLink,
      link: "https://jsonviewer.sahilrana.in",
    },
  ],
};

export const Mobifin = {
  title: "Mobifin",
  image: mobifinLogo,
  content:
    "Worked on the Mobifin project, a fintech platform that provides digital financial services, including mobile banking, payments, and financial management tools.",
  for: "Panamax Inc. (Now Bankai Infotech)",
  links: [
    {
      Icon: ExternalLink,
      link: "https://www.mobifin.com/",
    },
  ],
};

export const MyneChat = {
  title: "MyneChat",
  image: mynechatLogo,
  imageClassName: "p-2 object-contain object-center",
  content:
    "Lead the team and engineered the app from design to implementation, building a chat application for internal communication between teams, with features such as group conversations, file sharing, real-time notifications, user presence indicators, WebRTC calls, message forwarding, message replies, A feed for social interaction with likes, comments and shares, etc.",
  for: "Webmyne Systems Pvt. Ltd.",
  links: [],
};

export const MobifinTapestry = {
  title: "Mobifin Tapestry",
  image: mobifinTapestryLogo,
  imageClassName: "object-center",
  content:
    "Analyzed the requirements, did R&D for Mobifin Tapestry Admin portal and created initial multiple prototypes and iterations from scratch to build a composable UI architecture with Micro Frontends (Module Federation) and manage workflows dynamically using BPMN.",
  for: "Panamax Inc. (Now Bankai Infotech)",
  links: [
    {
      Icon: Linkedin,
      link: "https://www.linkedin.com/company/mobifin-tapestry",
    },
  ],
};

export const InsiderTradeAI = {
  title: "InsiderTrade.ai",
  image: insiderTradeLogo,
  imageClassName: "bg-white object-contain",
  content:
    "Engineered an AI chat based RegTech platform to answer questions about insider trading and regulatory compliance from a humongous knowledge base.",
  awards: [
    {
      title: "Winner of AI in Risk & Compliance at TOI AI Quotient Awards",
      links: [
        {
          title: "",
          Icon: ExternalLink,
          url: "https://toievents.indiatimes.com/ai-quotient-awards/winner#:~:text=INSIDERTRADE.AI%2DREGTECH%20INTELLIGENCE",
        },
        {
          title: "",
          Icon: Facebook,
          url: "https://www.facebook.com/TimesofIndia/posts/congratulations-to-insidertradeai-winner-of-ai-in-risk-compliance-at-toiaiquotie/1532087465632102/",
        },
        {
          title: "",
          Icon: Instagram,
          url: "https://www.instagram.com/p/DdG2k4Tis13/",
        },
      ],
    },
  ],
  for: "Webmyne Systems Pvt. Ltd.",
  links: [
    {
      Icon: ExternalLink,
      link: "https://www.insidertrade.ai/",
    },
  ],
};

export const Fixsy = {
  title: "Fixsy",
  image: fixsyLogo,
  imageClassName: "object-contain",
  content:
    "Architecting and leading the tech team to build a Canadian marketplace for home services.",
  for: "Webmyne Systems Pvt. Ltd.",
  links: [],
};

const projects = [
  Mobifin,
  MyneChat,
  MobifinTapestry,
  InsiderTradeAI,
  jsonViewerMeta,
  Fixsy,
  {
    title: "Esp8266 Car",
    image: esp32Car,
    content:
      "Restored my old RC car using an ESP8266 microcontroller and an L293D motor driver. The car is now controlled via a web interface and features a buzzer that plays honking sounds.",
    links: [
      {
        Icon: Github,
        link: "https://github.com/sahilsinghrana/esp8266RCcar",
      },
      {
        Icon: Youtube,
        link: "https://www.youtube.com/watch?v=1qfEjHxtqjI",
      },
    ],
  },
  {
    title: "TicTacToe",
    image: TicTacToeVanilla,
    content:
      "Developed a Node.js package that enables users to play Tic Tac Toe against the CPU using the Min-Max algorithm.",
    links: [
      {
        Icon: Github,
        link: "https://github.com/sahilsinghrana/tictactoe.js",
      },
      {
        Icon: Package,
        link: "https://www.npmjs.com/package/@sahilsinghrana/tictactoe.js",
      },
      {
        Icon: ExternalLink,
        link: "https://tictactoe.sahilrana.in",
      },
    ],
  },
  diziPlayerMeta,
  atrijMeta,

  {
    title: "Namaste-sahil",
    image: npxNamasteSahil,
    content: "Created an npx script that provides a personalized greeting.",
    links: [
      {
        Icon: Github,
        link: "https://github.com/sahilsinghrana/namaste-sahil",
      },
      {
        Icon: Package,
        link: "https://www.npmjs.com/package/namaste-sahil",
      },
    ],
  },
  {
    title: "Chat Application",
    image: nextChat,
    content:
      "Developed a chat application with Next.js for the frontend and Express.js for the backend.",
    links: [
      {
        Icon: ExternalLink,
        link: "https://next-chat-phi.vercel.app/",
      },
    ],
  },
  {
    title: "IWL 2021 Sponsorship Brochure",
    image: iwl,
    content:
      "Created the sponsorship brochure for the AIFF Indian Women's League 2021, designed for Baroda Football Academy, using Adobe InDesign.",
    links: [
      {
        Icon: ExternalLink,
        link: "https://sahilsinghrana.github.io/IWL-sponsorship-brochure/",
      },
    ],
  },
];

export default projects;
