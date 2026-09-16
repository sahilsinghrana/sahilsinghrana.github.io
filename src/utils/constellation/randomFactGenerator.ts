import {
  getRandomContentIndex,
  RANDOM_CONTENT_STORAGE_KEYS,
} from "@utils/randomContentStorage";

import sagittariusFacts from "./sagittariusFacts";
import miscFacts from "./miscFacts";

export default function getRandomFact(): string {
  const allFacts: string[] = [...miscFacts.map((fact) => fact.fact)];

  Object.values(sagittariusFacts).forEach((fact) => {
    allFacts.push(fact.fact);
  });

  const randomIndex = getRandomContentIndex(
    RANDOM_CONTENT_STORAGE_KEYS.moonFact,
    allFacts.length,
  );
  return allFacts[randomIndex];
}
