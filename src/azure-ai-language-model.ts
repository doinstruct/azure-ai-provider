import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1StreamPart,
  LanguageModelV1FunctionToolCall,
} from "@ai-sdk/provider";
import { AzureChatModelId, AzureChatSettings } from "./azure-ai-settings";
import { mapAzureFinishReason } from "./map-azure-finish-reason";
import { convertToAzureChatMessages } from "./convert-to-azure-messages";
import { azureAIFailedResponseHandler } from "./azure-ai-errors";
import { prepareTools } from "./azure-prepare-tools";
import { getResponseMetadata } from "./get-response-metadata";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { createSseStream } from "@azure/core-sse";

type AzureChatConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
};

export class AzureChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = "json";

  readonly modelId: AzureChatModelId;
  readonly settings: AzureChatSettings;

  private readonly config: AzureChatConfig;
  private readonly client: ReturnType<typeof ModelClient>;

  constructor(
    modelId: AzureChatModelId,
    settings: AzureChatSettings,
    config: AzureChatConfig
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;

    const apiKey = config.headers()["api-key"];
    if (!apiKey) {
      throw new Error("Azure API key is required");
    }

    this.client = ModelClient(config.baseURL, new AzureKeyCredential(apiKey));
  }

  get provider(): string {
    return this.config.provider;
  }

  private async getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const type = mode.type;
    const warnings: LanguageModelV1CallWarning[] = [];

    if (topK != null) {
      warnings.push({ type: "unsupported-setting", setting: "topK" });
    }

    const messages = await convertToAzureChatMessages(prompt);

    const baseArgs = {
      messages,
      model: this.modelId,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      stop: stopSequences,
      seed,
      response_format:
        responseFormat?.type === "json"
          ? responseFormat.schema != null
            ? {
                type: "json_schema",
                json_schema: {
                  schema: responseFormat.schema,
                  strict: true,
                  name: responseFormat.name ?? "response",
                  description: responseFormat.description,
                },
              }
            : { type: "json_object" }
          : undefined,
    };

    switch (type) {
      case "regular": {
        const { tools, tool_choice, toolWarnings } = prepareTools(mode);
        return {
          args: {
            ...baseArgs,
            tools,
            //ool_choice: "auto", // Always use "auto" when tools are present
            temperature: temperature ?? 0, // Make the model more deterministic with tools
          },
          warnings: [...warnings, ...toolWarnings],
        };
      }

      case "object-json": {
        return {
          args: {
            ...baseArgs,
          },
          warnings,
        };
      }

      case "object-tool": {
        return {
          args: {
            ...baseArgs,
            //tool_choice: "any",

            tools: [{ type: "function" as const, function: mode.tool }],
          },
          warnings,
        };
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const { args, warnings } = await this.getArgs(options);

    const response = await this.client.path("/chat/completions").post({
      body: args,
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.body.choices[0];
    const text = choice.message.content ?? "";

    return {
      text,
      toolCalls: choice.message.tool_calls?.map(
        (toolCall): LanguageModelV1FunctionToolCall => ({
          toolCallType: "function",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: toolCall.function.arguments,
        })
      ),
      finishReason: mapAzureFinishReason(choice.finish_reason ?? "unknown"),
      usage: {
        promptTokens: response.body.usage.prompt_tokens,
        completionTokens: response.body.usage.completion_tokens,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: response.headers },
      request: { body: JSON.stringify(args) },
      response: getResponseMetadata(response.body),
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const { args, warnings } = await this.getArgs(options);
    const body = { ...args, stream: true };

    const response = await this.client
      .path("/chat/completions")
      .post({
        body,
      })
      .asNodeStream();

    if (!response.body || response.status !== "200") {
      throw new Error(`Failed to get chat completions: ${response.status}`);
    }

    const { messages: rawPrompt, ...rawSettings } = args;
    const stream = createSseStream(response.body as any);
    let finishReason: LanguageModelV1FinishReason = "unknown";
    let usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN,
    };

    const functionArray: Array<{
      name: string;
      arguments: string;
      id: string;
    }> = [];

    return {
      stream: stream.pipeThrough(
        new TransformStream<{ data: string }, LanguageModelV1StreamPart>({
          transform(chunk, controller) {
            if (chunk.data === "[DONE]") {
              controller.enqueue({ type: "finish", finishReason, usage });
              return;
            }

            const data = JSON.parse(chunk.data);

            if (data.usage) {
              usage = {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
              };
            }

            const choice = data.choices?.[0];

            if (!choice) return;

            // Handle tool calls in delta responses
            if (choice.delta?.tool_calls) {
              for (const toolCall of choice.delta.tool_calls) {
                let index = functionArray.findIndex(
                  (f) => f.id === toolCall.id
                );

                if (index === -1) {
                  index = functionArray.length;
                  functionArray.push({
                    name: toolCall.function?.name || "",
                    arguments: toolCall.function?.arguments || "",
                    id: toolCall.id,
                  });
                } else if (toolCall.function?.arguments) {
                  functionArray[index].arguments += toolCall.function.arguments;
                } else if (toolCall.function?.name) {
                  functionArray[index].name = toolCall.function.name;
                }

                // If we have complete arguments, emit the tool call
                if (
                  functionArray[index].name &&
                  functionArray[index].arguments
                ) {
                  try {
                    controller.enqueue({
                      type: "tool-call",
                      toolCallType: "function",
                      toolCallId: functionArray[index].id,
                      toolName: functionArray[index].name,
                      args: functionArray[index].arguments,
                    });
                  } catch (e) {
                    console.error("Failed to parse tool call:", e);
                  }
                }
              }
            }

            // Handle text content
            if (choice.delta?.content) {
              controller.enqueue({
                type: "text-delta",
                textDelta: choice.delta.content,
              });
            }

            // Update finish reason if present
            if (choice.delta?.finish_reason) {
              finishReason = mapAzureFinishReason(choice.delta.finish_reason);
            }
          },
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: response.headers },
      request: { body: JSON.stringify(body) },
      warnings,
    };
  }
}
