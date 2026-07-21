const WINDOW_MS = 60_000;
const LIMITS = {
  completion: 12,
  review: 3,
} as const;

export type AiRequestKind = keyof typeof LIMITS;

type AcquireInput = Readonly<{
  kind: AiRequestKind;
  now: number;
  userKey: string;
}>;

type UserRateState = {
  active: boolean;
  completion: number[];
  review: number[];
};

export class AiRateLimitError extends Error {
  override readonly name = "AiRateLimitError";
  readonly code = "ai_rate_limited";

  constructor() {
    super("AI assistance rate limit reached.");
  }
}

export class AiConcurrentRequestError extends Error {
  override readonly name = "AiConcurrentRequestError";
  readonly code = "ai_request_in_progress";

  constructor() {
    super("Another AI assistance request is already active.");
  }
}

export class AiRateLimiter {
  readonly #users = new Map<string, UserRateState>();

  acquire(input: AcquireInput): () => void {
    const state = this.#users.get(input.userKey) ?? {
      active: false,
      completion: [],
      review: [],
    };
    if (state.active) {
      throw new AiConcurrentRequestError();
    }
    const recent = state[input.kind].filter((timestamp) => input.now - timestamp < WINDOW_MS);
    if (recent.length >= LIMITS[input.kind]) {
      throw new AiRateLimitError();
    }
    state[input.kind] = [...recent, input.now];
    state.active = true;
    this.#users.set(input.userKey, state);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.active = false;
    };
  }
}
