import {
  LanguageModelV1Prompt,
  UnsupportedFunctionalityError,
  LanguageModelV1TextPart,
  LanguageModelV1ImagePart,
  LanguageModelV1FilePart,
} from "@ai-sdk/provider";
import {
  ChatRequestMessage,
  ChatMessageContentItem,
} from "@azure-rest/ai-inference";

export function convertToAzureChatMessages(
  prompt: LanguageModelV1Prompt
): ChatRequestMessage[] {
  const messages: ChatRequestMessage[] = [];
  for (const message of prompt) {
    if (message.role === "user") {
      if (typeof message.content === "string") {
        messages.push({ role: message.role, content: message.content });
        continue;
      }

      if (message.content.length === 1 && message.content[0].type === "text") {
        messages.push({ role: message.role, content: message.content[0].text });
        continue;
      }

      messages.push({
        role: "user",
        content: message.content.map((part, index) => {
          switch (part.type) {
            case "text": {
              return {
                type: "text",
                text: (part as LanguageModelV1TextPart).text,
              };
            }
            case "image": {
              const imagePart = part as LanguageModelV1ImagePart;

              let imageUrl;
              if (imagePart.image instanceof URL) {
                imageUrl = imagePart.image.toString();
              } else {
                const imageBuffer = Buffer.isBuffer(imagePart.image)
                  ? imagePart.image
                  : Buffer.from(imagePart.image);

                // Convert to base64 string
                const base64Image = imageBuffer.toString("base64");
                imageUrl = `data:${
                  imagePart.mimeType ?? "image/jpeg"
                };base64,${base64Image}`;
              }

              return {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail:
                    imagePart.providerMetadata?.openai?.imageDetail ?? "auto",
                },
              };
            }
            case "file": {
              const filePart = part as LanguageModelV1FilePart;
              if (filePart.data instanceof URL) {
                throw new UnsupportedFunctionalityError({
                  functionality:
                    "'File content parts with URL data' functionality not supported.",
                });
              }

              switch (filePart.mimeType) {
                case "audio/wav": {
                  return {
                    type: "input_audio",
                    input_audio: { data: filePart.data, format: "wav" },
                  };
                }
                case "audio/mp3":
                case "audio/mpeg": {
                  return {
                    type: "input_audio",
                    input_audio: { data: filePart.data, format: "mp3" },
                  };
                }
                case "application/pdf": {
                  const partName = `part-${index}.pdf`;
                  return {
                    type: "file",
                    file: {
                      filename: partName,
                      file_data: `data:application/pdf;base64,${filePart.data}`,
                    },
                  };
                }
                default: {
                  throw new UnsupportedFunctionalityError({
                    functionality: `File content part type ${filePart.mimeType} in user messages`,
                  });
                }
              }
            }
          }
        }),
      });
    } else {
      // For system and assistant roles
      if (typeof message.content === "string") {
        messages.push({ role: message.role, content: message.content });
        continue;
      }

      if (message.content.length === 1 && message.content[0].type === "text") {
        messages.push({ role: message.role, content: message.content[0].text });
      } else {
        // Handle if there are multiple content parts for non-user roles
        const textContent = message.content
          .filter(
            (part): part is LanguageModelV1TextPart => part.type === "text"
          )
          .map((part) => part.text)
          .join(" ");
        messages.push({ role: message.role, content: textContent });
      }
    }
  }
  return messages;
}
