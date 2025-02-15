import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import {
  ChatCompletionsToolDefinition,
  ChatCompletionsNamedToolChoice,
} from "@azure-rest/ai-inference";

export function prepareTools(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  }
): {
  tools: ChatCompletionsToolDefinition[] | undefined;
  tool_choice?: string | undefined;
  toolWarnings: LanguageModelV1CallWarning[];
} {
  const tools = mode.tools?.length ? mode.tools : undefined;
  const toolWarnings: LanguageModelV1CallWarning[] = [];

  if (tools == null) {
    return { tools: undefined, tool_choice: undefined, toolWarnings };
  }

  const azureTools = tools
    .map((tool) => {
      if (tool.type === "provider-defined") {
        toolWarnings.push({ type: "unsupported-tool", tool });
        return null;
      }

      // Ensure parameters match Azure's expected format
      const parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required: string[];
      } = {
        type: "object",
        properties: tool.parameters.properties || {},
        required: tool.parameters.required || [],
      };

      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description ?? undefined,
          parameters,
        },
      };
    })
    .filter((tool): tool is NonNullable<typeof tool> => tool !== null);

  return {
    tools: azureTools,
    // Azure expects tool_choice to be a string
    tool_choice: azureTools.length > 0 ? "auto" : undefined,
    toolWarnings,
  };
}
