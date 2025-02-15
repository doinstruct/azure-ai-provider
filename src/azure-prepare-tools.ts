import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";

export function prepareTools(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  }
): {
  tools:
    | Array<{
        type: "function";
        function: {
          name: string;
          description: string | undefined;
          parameters: unknown;
        };
      }>
    | undefined;
  tool_choice:
    | { type: "function"; function: { name: string } }
    | "auto"
    | "none"
    | "any"
    | undefined;
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
      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description ?? undefined,
          parameters: tool.parameters,
        },
      };
    })
    .filter((tool): tool is NonNullable<typeof tool> => tool !== null);

  const toolChoice = mode.toolChoice;

  if (toolChoice == null) {
    return { tools: azureTools, tool_choice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
    case "none":
      return { tools: azureTools, tool_choice: type, toolWarnings };
    case "required":
      return { tools: azureTools, tool_choice: "any", toolWarnings };
    case "tool":
      return {
        tools: azureTools.filter(
          (tool) => tool.function.name === toolChoice.toolName
        ),
        tool_choice: "any",
        toolWarnings,
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}
