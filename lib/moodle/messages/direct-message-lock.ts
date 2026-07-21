type DirectMessageResult = Readonly<{
  conversationId: number;
  messageId: number;
}>;

const LOCK_TTL_MS = 60_000;
const operations = new Map<string, Readonly<{
  expiresAt: number;
  promise: Promise<DirectMessageResult>;
}>>();

export async function withDirectMessageLock(
  key: string,
  action: () => Promise<DirectMessageResult>,
): Promise<DirectMessageResult> {
  const now = Date.now();
  const existing = operations.get(key);
  if (existing !== undefined && existing.expiresAt > now) return existing.promise;
  if (existing !== undefined) operations.delete(key);
  const promise = action().catch((error: unknown) => {
    operations.delete(key);
    throw error;
  });
  operations.set(key, { expiresAt: now + LOCK_TTL_MS, promise });
  return promise;
}
