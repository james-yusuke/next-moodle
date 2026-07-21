export class SameOriginError extends Error {
  override readonly name = "SameOriginError";
  readonly code = "origin_rejected";

  constructor() {
    super("Request origin was rejected.");
  }
}

function publicRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host === null) {
    return requestUrl.origin;
  }
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === null ? requestUrl.protocol : `${forwardedProtocol}:`;
  if (
    (protocol !== "http:" && protocol !== "https:") ||
    host.includes(",") ||
    !URL.canParse(`${protocol}//${host}`)
  ) {
    throw new SameOriginError();
  }
  const publicUrl = new URL(`${protocol}//${host}`);
  if (
    publicUrl.pathname !== "/" ||
    publicUrl.search !== "" ||
    publicUrl.hash !== "" ||
    publicUrl.username !== "" ||
    publicUrl.password !== ""
  ) {
    throw new SameOriginError();
  }
  return publicUrl.origin;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null || !URL.canParse(origin)) {
    throw new SameOriginError();
  }
  if (new URL(origin).origin !== publicRequestOrigin(request)) {
    throw new SameOriginError();
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new SameOriginError();
  }
}

export function assertSameOriginMutation(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    throw new SameOriginError();
  }
  assertSameOrigin(request);
}
