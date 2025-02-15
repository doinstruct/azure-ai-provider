// import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
// import { createAzure } from "./azure-ai-provider";
// import { config } from "dotenv";

// config();

// describe("AzureEmbeddingModel", () => {
//   const testValues = ["sunny day at the beach", "rainy day in the city"];
//   const MODEL_NAME = "text-embedding-3-small";

//   it("should generate embeddings successfully", async () => {
//     const provider = createAzure({
//       endpoint: process.env.AZURE_API_ENDPOINT,
//       apiKey: process.env.AZURE_API_KEY,
//     });

//     const model = provider.textEmbeddingModel(MODEL_NAME);
//     const result = await model.doEmbed({
//       values: testValues,
//     });

//     expect(result.embeddings).toBeDefined();
//     expect(result.embeddings.length).toBe(2);
//     expect(result.embeddings[0].length).toBeGreaterThan(0);
//     expect(result.usage?.tokens).toBeGreaterThan(0);
//     expect(result.rawResponse?.headers).toBeDefined();
//   });

//   it("should handle batch size limits", async () => {
//     const provider = createAzure({
//       endpoint: process.env.AZURE_API_ENDPOINT,
//       apiKey: process.env.AZURE_API_KEY,
//     });

//     const model = provider.textEmbeddingModel(MODEL_NAME, {
//       maxEmbeddingsPerCall: 1,
//     });

//     expect(model.maxEmbeddingsPerCall).toBe(1);

//     const result = await model.doEmbed({
//       values: testValues,
//     });

//     expect(result.embeddings.length).toBe(2);
//   });

//   it("should handle errors gracefully", async () => {
//     const provider = createAzure({
//       endpoint: process.env.AZURE_API_ENDPOINT,
//       apiKey: "invalid-key",
//     });

//     const model = provider.textEmbeddingModel(MODEL_NAME);

//     await expect(
//       model.doEmbed({
//         values: testValues,
//       })
//     ).rejects.toThrow();
//   });

//   it("should respect abort signals", async () => {
//     const provider = createAzure({
//       endpoint: process.env.AZURE_API_ENDPOINT,
//       apiKey: process.env.AZURE_API_KEY,
//     });

//     const model = provider.textEmbeddingModel(MODEL_NAME);
//     const controller = new AbortController();

//     const embedPromise = model.doEmbed({
//       values: testValues,
//       abortSignal: controller.signal,
//     });

//     controller.abort();

//     await expect(embedPromise).rejects.toThrow("operation was aborted");
//   });

//   it("should handle custom headers", async () => {
//     const provider = createAzure({
//       endpoint: process.env.AZURE_API_ENDPOINT,
//       apiKey: process.env.AZURE_API_KEY,
//       headers: {
//         "X-Custom-Header": "test-value",
//       },
//     });

//     const model = provider.textEmbeddingModel(MODEL_NAME);
//     const result = await model.doEmbed({
//       values: testValues,
//     });

//     expect(result.embeddings).toBeDefined();
//   });
// });
