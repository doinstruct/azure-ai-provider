import { createAzure } from "./src/azure-ai-provider";
import { CoreMessage, generateText, smoothStream, streamText, tool } from "ai";
import { z } from "zod";
import dotenv from "dotenv";
import * as readline from "node:readline/promises";

dotenv.config();

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];

const azure = createAzure({
  endpoint: process.env.AZURE_API_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
});

async function streaming() {
  while (true) {
    const userInput = await terminal.question("You: ");
    messages.push({ role: "user", content: userInput });

    const result = streamText({
      model: azure("DeepSeek-R1"),
      messages,
      experimental_transform: smoothStream({ chunking: "word" }),
      temperature: 0,
      maxTokens: 400,
      system:
        "You are an assistant that can answer questions and perform tasks",
    });

    process.stdout.write("Assistant: ");
    let assistantResponse = "";
    for await (const part of result.textStream) {
      process.stdout.write(part);
      assistantResponse += part;
    }
    process.stdout.write("\n");

    messages.push({ role: "assistant", content: assistantResponse });
  }
}

async function blocking() {
  while (true) {
    const userInput = await terminal.question("You: ");
    messages.push({ role: "user", content: userInput });

    const result = await generateText({
      model: azure("DeepSeek-R1"),
      messages,
      tools: {
        get_weather: tool({
          description:
            "Get the current weather in a given location (in Celsius)",
          parameters: z.object({
            location: z.string().describe("The city to get the weather for"),
          }),
          execute: async ({ location }) =>
            "The weather in " + location + " is 0 degrees Celsius.",
        }),
      },
      temperature: 0,
      maxTokens: 400,
      system:
        "You are an assistant that can answer questions and perform tasks.",
    });

    console.log("Assistant:", result.text);
  }
}

streaming().catch(console.error);
