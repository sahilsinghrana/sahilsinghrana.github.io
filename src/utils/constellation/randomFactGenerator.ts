import { getRandom } from "@components/Spotify/helpers/utils";

import sagittariusFacts from "./sagittariusFacts";

export default function getRandomFact(): string {
  const allFacts: string[] = [];

  Object.values(sagittariusFacts).forEach((fact) => {
    allFacts.push(
      fact.fact.startsWith("Sagittarius")
        ? fact.fact
        : "Sagittarius: " + fact.fact,
    );
  });

  const randomIndex = getRandom(0, Object.keys(allFacts).length - 1);
  return allFacts[randomIndex];
}
