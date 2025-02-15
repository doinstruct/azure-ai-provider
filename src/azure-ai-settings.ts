export interface AzureChatSettings {
  safePrompt?: boolean;
}

/**
 * The model ID in Azure is the deployment name you created in Azure OpenAI Service
 * For example: "gpt-4", "gpt-35-turbo", etc.
 */
export type AzureChatModelId = string;
