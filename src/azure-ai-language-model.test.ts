import { LanguageModelV1Prompt } from "@ai-sdk/provider";
import { createAzure } from "./azure-ai-provider";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { config } from "dotenv";

config();

const hasCredentials =
  process.env.AZURE_API_KEY && process.env.AZURE_API_ENDPOINT;

describe("AzureChatLanguageModel", () => {
  const mockResponse = {
    id: "mock-id",
    object: "chat.completion",
    created: Date.now(),
    model: "gpt-4",
    choices: [
      {
        message: {
          role: "assistant",
          content: "Hello, world!",
        },
        finish_reason: "stop",
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };

  const testPrompt: LanguageModelV1Prompt = [
    { role: "user", content: [{ type: "text", text: "Say hello" }] },
  ];

  (hasCredentials ? it : it.skip)(
    "should generate text successfully",
    async () => {
      const provider = createAzure({
        endpoint: process.env.AZURE_API_ENDPOINT,
        apiKey: process.env.AZURE_API_KEY,
      });

      const model = provider.languageModel("Llama-3.3-70B-Instruct");
      const result = await model.doGenerate({
        prompt: testPrompt,
        inputFormat: "prompt",
        mode: {
          type: "regular",
        },
      });

      expect(result.text).toBeTruthy();
      expect(result.usage).toBeDefined();
      expect(result.finishReason).toBeDefined();
      console.log(result);
    }
  );

  (hasCredentials ? it : it.skip)(
    "should handle streaming responses",
    async () => {
      const provider = createAzure({
        endpoint: process.env.AZURE_API_ENDPOINT,
        apiKey: process.env.AZURE_API_KEY,
      });

      const model = provider.languageModel("Llama-3.3-70B-Instruct");
      const stream = await model.doStream({
        prompt: testPrompt,
        inputFormat: "prompt",
        mode: {
          type: "regular",
        },
      });

      const chunks: string[] = [];
      for await (const chunk of stream.stream) {
        if (chunk.type === "text-delta") {
          chunks.push(chunk.textDelta);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join("")).toBeTruthy();
      console.log(chunks.join(""));
    }
  );

  (hasCredentials ? it : it.skip)("should handle tools correctly", async () => {
    const provider = createAzure({
      endpoint: process.env.AZURE_API_ENDPOINT,
      apiKey: process.env.AZURE_API_KEY,
    });

    const model = provider.languageModel("Llama-3.3-70B-Instruct");
    const result = await model.doGenerate({
      prompt: testPrompt,
      inputFormat: "prompt",
      mode: {
        type: "regular",
        tools: [
          {
            type: "function",
            name: "getCurrentTime",
            description: "Get the current time",
            parameters: {
              type: "object",
              properties: {},
            },
          },
        ],
      },
    });

    expect(result.text).toBeTruthy();
    expect(result.warnings).toBeDefined();
    console.log(result);
  });
});
