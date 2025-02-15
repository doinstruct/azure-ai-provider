import {
  LanguageModelV1Prompt,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import { convertUint8ArrayToBase64 } from "@ai-sdk/provider-utils";
import {
  ChatRequestMessage,
  ChatMessageContentItem,
} from "@azure-rest/ai-inference";

export function convertToAzureChatMessages(
  prompt: LanguageModelV1Prompt
): Array<ChatRequestMessage> {
  const messages: Array<ChatRequestMessage> = [];

  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        messages.push({ role: "system", content });
        break;
      }

      case "user": {
        const transformedContent = content.map(
          (part): ChatMessageContentItem => {
            switch (part.type) {
              case "text": {
                return { type: "text", text: part.text };
              }
              case "image": {
                return {
                  type: "image_url",
                  image_url: {
                    url:
                      part.image instanceof URL
                        ? part.image.toString()
                        : `data:${
                            part.mimeType ?? "image/jpeg"
                          };base64,${convertUint8ArrayToBase64(part.image)}`,
                  },
                };
              }
              case "file": {
                throw new UnsupportedFunctionalityError({
                  functionality: "File content parts in user messages",
                });
              }
            }
          }
        );

        messages.push({
          role: "user",
          content:
            content.length === 1 && content[0].type === "text"
              ? content[0].text
              : transformedContent,
        });
        break;
      }

      case "assistant": {
        let text = "";
        const toolCalls = [];

        for (const part of content) {
          switch (part.type) {
            case "text": {
              text += part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function" as const,
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args),
                },
              });
              break;
            }
            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
            }
          }
        }

        messages.push({
          role: "assistant",
          content: text || undefined,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        });
        break;
      }

      case "tool": {
        for (const toolResponse of content) {
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResponse.result),
            tool_call_id: toolResponse.toolCallId,
          });
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
