import { LanguageModelV1Prompt } from "@ai-sdk/provider";
import { convertUint8ArrayToBase64 } from "@ai-sdk/provider-utils";
import {
  ChatRequestMessage,
  ChatMessageContentItem,
} from "@azure-rest/ai-inference";

export function convertToAzureChatMessages(
  prompt: LanguageModelV1Prompt
): Array<ChatRequestMessage> {
  return prompt.map((message) => {
    if (Array.isArray(message.content)) {
      // Convert content array to string
      return {
        ...message,
        content: message.content
          .map((content) => {
            if (content.type === "text") return content.text;
            return "";
          })
          .join(""),
      };
    }
    // Message content is already a string
    return message;
  });
}
