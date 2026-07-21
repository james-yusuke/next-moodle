export class AiInputError extends Error {
  override readonly name = "AiInputError";
  readonly code = "ai_invalid_request";

  constructor() {
    super("AI assistance request is invalid.");
  }
}

export class AiConsentError extends Error {
  override readonly name = "AiConsentError";
  readonly code = "ai_consent_required";

  constructor() {
    super("AI assistance consent is required.");
  }
}

export class AiDisabledError extends Error {
  override readonly name = "AiDisabledError";
  readonly code = "ai_disabled";

  constructor() {
    super("AI assistance is disabled.");
  }
}

export class AiAssignmentUnsupportedError extends Error {
  override readonly name = "AiAssignmentUnsupportedError";
  readonly code = "ai_assignment_unsupported";

  constructor() {
    super("AI assistance is unavailable for this assignment.");
  }
}

export class AiProviderRefusalError extends Error {
  override readonly name = "AiProviderRefusalError";
  readonly code = "ai_refused";

  constructor() {
    super("The AI provider refused the request.");
  }
}

export class AiProviderResponseError extends Error {
  override readonly name = "AiProviderResponseError";
  readonly code = "ai_invalid_response";

  constructor() {
    super("The AI provider returned an invalid response.");
  }
}

export class AiProviderRateLimitError extends Error {
  override readonly name = "AiProviderRateLimitError";
  readonly code = "ai_provider_rate_limited";

  constructor() {
    super("The AI provider rate limit was reached.");
  }
}

export class AiProviderTimeoutError extends Error {
  override readonly name = "AiProviderTimeoutError";
  readonly code = "ai_timeout";

  constructor() {
    super("The AI provider request timed out.");
  }
}

export class AiProviderUnavailableError extends Error {
  override readonly name = "AiProviderUnavailableError";
  readonly code = "ai_unavailable";

  constructor() {
    super("The AI provider is temporarily unavailable.");
  }
}
