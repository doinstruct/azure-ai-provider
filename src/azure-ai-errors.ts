import {
  createJsonErrorResponseHandler,
  type ResponseHandler,
} from "@ai-sdk/provider-utils";
import type { APICallError } from "@ai-sdk/provider";
import { z } from "zod";

const azureAIErrorSchema = z.object({
  error: z.object({
    object: z.literal("error"),
    message: z.string(),
    type: z.string(),
    param: z.string().nullable(),
    code: z.string().nullable(),
  }),
});

export const azureAIFailedResponseHandler: ResponseHandler<APICallError> =
  createJsonErrorResponseHandler({
    errorSchema: azureAIErrorSchema,
    errorToMessage: (data) => data.error.message,
  });
