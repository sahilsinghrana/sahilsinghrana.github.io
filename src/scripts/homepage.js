import { getRandomShloka } from "@utils/constants";

function fillShlokas() {
  const shlokaData = getRandomShloka();

  const shlokaDevanagari = document.getElementById("shlokaDevanagari");
  const shlokaTranslation = document.getElementById("shlokaTranslation");
  const shlokaChapter = document.getElementById("shlokaChapter");

  if (shlokaDevanagari) shlokaDevanagari.innerText = shlokaData.text;
  if (shlokaTranslation) shlokaTranslation.innerText = shlokaData.translation;
  if (shlokaChapter)
    shlokaChapter.innerText =
      `- ${shlokaData.source || ""}` + `(${shlokaData.chapter})`;
}

fillShlokas();
