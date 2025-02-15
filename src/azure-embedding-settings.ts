export interface AzureEmbeddingSettings {
  /**
   * The maximum number of embeddings that can be generated in a single API call.
   */
  maxEmbeddingsPerCall?: number;
}

/**
 * The model ID in Azure is the deployment name you created in Azure OpenAI Service
 * For example: "text-embedding-ada-002", etc.
 */
export type AzureEmbeddingModelId = string;
