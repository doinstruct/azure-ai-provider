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

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");
    messages.push({ role: "user", content: userInput });

    const result = await generateText({
      model: azure("DeepSeek-R1"),
      messages: [
        {
          role: "system",
          content: "Use the tools provided to best answer the user's question.",
        },
        ...messages,
      ],
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
      maxTokens: 100,
    });

    process.stdout.write("\nAssistant: ");
    console.log(JSON.stringify(result, null, 2));
    messages.push({ role: "assistant", content: result.text });
  }
}

main().catch(console.error);
