import { ExternalLink, Github, Package, Youtube } from "lucide-astro";

import iwl from "@images/projects/iwl.webp";
import nextChat from "@images/projects/nextchat.webp";
import esp32Car from "@images/projects/esp8266car.webp";
import diziPlayer from "@images/projects/diziPlayer.webp";
import npxNamasteSahil from "@images/projects/npxNamasteSahil.webp";
import TicTacToeVanilla from "@images/projects/TicTacToeVanilla.webp";

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

const projects = [
  jsonViewerMeta,
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
