# AI SDK - Azure Custom Provider

The Azure custom provider for the [AI SDK](https://sdk.vercel.ai/docs) enables integration with Azure-hosted language models that use Azure's native APIs instead of the OpenAI API format.

## Status

- ✅ Chat Completions: Working with both streaming and non-streaming responses
- ⚠️ Tool Calling: Implementation present but functionality depends on model capabilities
- ⚠️ Embeddings: Implementation present but untested

## Installation

The Azure provider is available in the `@ai-sdk/azure` module. You can install it with

```bash
npm i @quail-ai/azure-ai-provider
```

## Setup

1. Create an Azure AI resource and get your endpoint URL and API key
2. Set up environment variables in your .env file:

```env
AZURE_API_ENDPOINT=https://<your-resource>.services.ai.azure.com/models
AZURE_API_KEY=<your-api-key>
```

## Basic Usage

```ts
import { createAzure } from "@quail-ai/azure-ai-provider";
import { generateText } from "ai";

// Create provider instance
const azure = createAzure({
  endpoint: process.env.AZURE_API_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
});

// Generate text
const { text } = await generateText({
  model: azure("your-deployment-name"),
  prompt: "Write a story about a robot.",
});
```

## Advanced Features

### Streaming Responses

```ts
import { streamText } from "ai";

const stream = await streamText({
  model: azure("your-deployment-name"),
  prompt: "Generate a long story...",
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Tool Calling

```ts
import { generateText } from "ai";
import { z } from "zod";

const result = await generateText({
  model: azure("your-deployment-name"),
  messages: [{ role: "user", content: "What's the weather?" }],
  tools: {
    get_weather: {
      description: "Get weather for location",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return `Weather in ${location}: Sunny`;
      },
    },
  },
});
```

### Text Embeddings

```ts
const model = azure.textEmbeddingModel("your-embedding-deployment");

const result = await model.doEmbed({
  values: ["Encode this text"],
});
```

## Configuration Options

```ts
const azure = createAzure({
  endpoint: "https://your-endpoint.com",
  apiKey: "your-key",
  apiVersion: "2024-02-15-preview", // Optional API version
});
```

## Error Handling

```ts
try {
  const result = await generateText({
    model: azure("your-deployment"),
    prompt: "Generate text...",
  });
} catch (error) {
  if (error.response) {
    console.error("API Error:", error.message);
  }
}
```

## Related Links

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Azure AI Services](https://azure.microsoft.com/products/ai-services)

## License

MIT
