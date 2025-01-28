import { ExternalLink, Github, Package, Youtube } from "lucide-astro";

import esp32Car from "@images/projects/esp8266car.webp";
import TicTacToeVanilla from "@images/projects/TicTacToeVanilla.webp";
import npxNamasteSahil from "@images/projects/npxNamasteSahil.webp";
import nextChat from "@images/projects/nextchat.webp";
import diziPlayer from "@images/projects/diziPlayer.webp";
import iwl from "@images/projects/iwl.webp";

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

const projects = [
  {
    title: "Esp8266 Car",
    image: esp32Car,
    content:
      "Built and fixed my old RC car using Esp8266 and L239D Motor Driver. With a buzzer to play honk sounds and a web controller to control the car.",
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
      "Built a Node.js Package to play TicTacToe with the CPU usin Min-Max algorithm.",
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
  {
    title: "Namaste-sahil",
    image: npxNamasteSahil,
    content: "Built a npx script to greet me.",
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
  diziPlayerMeta,
  {
    title: "Chat Application",
    image: nextChat,
    content:
      "Built a chat application using Next.js as Frontend and Express.js.",
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
      "Designed AIFF Indian Women's League 2021 Sponsorship Brochure for Baroda Football Academy using Adobe InDesign.",
    links: [
      {
        Icon: ExternalLink,
        link: "https://sahilsinghrana.github.io/IWL-sponsorship-brochure/",
      },
    ],
  },
];

export default projects;
