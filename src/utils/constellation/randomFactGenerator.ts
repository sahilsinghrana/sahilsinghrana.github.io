import { getRandom } from "@components/Spotify/helpers/utils";

import sagittariusFacts from "./sagittariusFacts";
import miscFacts from "./miscFacts";

export default function getRandomFact(): string {
  const allFacts: string[] = [...miscFacts.map((fact) => fact.fact)];

  Object.values(sagittariusFacts).forEach((fact) => {
    allFacts.push(fact.fact);
  });

  const randomIndex = getRandom(0, Object.keys(allFacts).length - 1);
  return allFacts[randomIndex];
}
