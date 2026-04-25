import { OpenRouter } from "@openrouter/sdk";

export class OpenRouterEmbeddingsClient {
  constructor({ apiKey, model, serverURL }) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required to generate embeddings.");
    }

    const options = { apiKey };
    if (serverURL) {
      options.serverURL = serverURL;
    }

    this.client = new OpenRouter(options);
    this.model = model;
  }

  async embedTexts(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const response = await this.client.embeddings.generate({
      requestBody: {
        model: this.model,
        input: texts,
      },
    });

    if (
      !response ||
      typeof response === "string" ||
      !Array.isArray(response.data)
    ) {
      throw new Error(
        `Unexpected OpenRouter embedding response: ${JSON.stringify(response)}`,
      );
    }

    if (response.data.length !== texts.length) {
      throw new Error(
        `OpenRouter returned ${response.data.length} embeddings for ${texts.length} inputs.`,
      );
    }

    return response.data.map((item, index) => {
      if (!Array.isArray(item.embedding)) {
        throw new Error(
          `OpenRouter returned invalid embedding for input index ${index}.`,
        );
      }

      return item.embedding;
    });
  }
}
