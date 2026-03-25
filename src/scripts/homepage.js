import { getRandomShloka } from "@utils/constants";

function fillShlokas() {
  const shlokaData = getRandomShloka();

  const shlokaDevanagari = document.getElementById("shlokaDevanagari");
  const shlokaTranslation = document.getElementById("shlokaTranslation");
  const shlokaChapter = document.getElementById("shlokaChapter");
  const shlokaImage = document.getElementById("shlokaBG");

  if (shlokaDevanagari) shlokaDevanagari.innerText = shlokaData.text;
  if (shlokaTranslation) shlokaTranslation.innerText = shlokaData.translation;
  if (shlokaChapter)
    shlokaChapter.innerText =
      `- ${shlokaData.source || ""}` + `(${shlokaData.chapter})`;

  if (shlokaImage && shlokaData.imageUrl?.src) {
    shlokaImage.src = shlokaData.imageUrl?.src;
  }
}

fillShlokas();
