import { Github, Youtube } from "lucide-astro";

import esp32Car from "@images/projects/esp8266car.webp"

const projects = [
    {
      title: "Esp8266 Car",
      image: esp32Car,
      content: "Built and fixed my old RC car using Esp8266 and L239D Motor Driver. With a buzzer to play honk sounds and a web controller to control the car.",
      links: [
        {
          Icon: Github,
          link: "https://github.com/sahilsinghrana/esp8266RCcar"
        },
        {
          Icon: Youtube,
          link: "https://www.youtube.com/watch?v=1qfEjHxtqjI"
        }
      ]
    },
    {
      title: "TicTacToe",
      image: "",
      content: "Built a Node.js Package to play TicTacToe with the CPU usin Min-Max algorithm.",
      links: [
        {
          Icon: Github,
          link: "https://github.com/sahilsinghrana/tictactoe.js"
        }
      ]
    },
    {
      title: "Chat Application",
      image: "",
      content: "Built a chat application with Next.js as Frontend and Express.js as backend with websockets.",
      links: [
        {
          Icon: Github,
          link: ""
        }
      ]
    }
  ]

  export default projects;