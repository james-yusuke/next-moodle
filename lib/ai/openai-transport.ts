import "server-only";

import OpenAI from "openai";

import type { AiRuntimeConfig } from "./config";
import {
  AiProviderRateLimitError,
  AiProviderRefusalError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from "./errors";
import {
  OpenAiWritingProvider,
  type AiWritingProvider,
  type OpenAiCompletionTransportRequest,
  type OpenAiReviewTransportRequest,
  type OpenAiTransport,
} from "./provider";

type OpenAiTransportOptions = Readonly<{
  apiKey: string;
  baseUrl?: string;
}>;

function mapOpenAiError(error: unknown, signal: AbortSignal): Error {
  if (signal.aborted || error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AiProviderTimeoutError();
  }
  if (error instanceof OpenAI.RateLimitError) {
    return new AiProviderRateLimitError();
  }
  if (
    error instanceof OpenAI.BadRequestError &&
    (error.code === "content_policy_violation" || error.code === "safety_violation")
  ) {
    return new AiProviderRefusalError();
  }
  return new AiProviderUnavailableError();
}

export class OpenAiSdkTransport implements OpenAiTransport {
  readonly #client: OpenAI;

  constructor(options: OpenAiTransportOptions) {
    this.#client = new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 0,
      ...(options.baseUrl === undefined ? {} : { baseURL: options.baseUrl }),
    });
  }

  async createCompletion(
    request: OpenAiCompletionTransportRequest,
  ): Promise<AsyncIterable<unknown>> {
    try {
      return await this.#client.responses.create({
        input: request.input,
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens,
        model: request.model,
        reasoning: { effort: request.reasoningEffort },
        safety_identifier: request.safetyIdentifier,
        store: request.store,
        stream: true,
        text: { verbosity: "low" },
      }, { signal: request.signal });
    } catch (error) {
      throw mapOpenAiError(error, request.signal);
    }
  }

  async createReview(request: OpenAiReviewTransportRequest): Promise<string> {
    try {
      const response = await this.#client.responses.create({
        input: request.input,
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens,
        model: request.model,
        reasoning: { effort: request.reasoningEffort },
        safety_identifier: request.safetyIdentifier,
        store: request.store,
        text: {
          format: request.responseSchema,
          verbosity: "low",
        },
      }, { signal: request.signal });
      if (response.output_text.trim() === "") throw new AiProviderRefusalError();
      return response.output_text;
    } catch (error) {
      if (error instanceof AiProviderRefusalError) throw error;
      throw mapOpenAiError(error, request.signal);
    }
  }
}

export function createOpenAiWritingProvider(
  config: AiRuntimeConfig,
  options: Readonly<{ baseUrl?: string }> = {},
): AiWritingProvider | null {
  if (!config.enabled) return null;
  return new OpenAiWritingProvider({
    completionModel: config.completionModel,
    reviewModel: config.reviewModel,
    transport: new OpenAiSdkTransport({
      apiKey: config.apiKey,
      ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
    }),
  });
}
