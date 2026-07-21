export const jsonResponse = (
  payload: unknown,
  status = 200,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  })
  return new Response(JSON.stringify(payload), { status, headers })
}

export const moodleException = (
  exception: string,
  errorcode: string,
  message: string,
  status = 200,
): Response =>
  jsonResponse({ exception, errorcode, message, debuginfo: "", reproductionlink: "" }, status)

export const invalidLogin = (): Response =>
  jsonResponse({
    error: "Invalid login, please try again",
    errorcode: "invalidlogin",
    stacktrace: "",
    debuginfo: "",
  })

export const malformedResponse = (): Response =>
  new Response('{"exception":"malformed_fixture"', {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  })

export const transientOutage = (): Response =>
  jsonResponse(
    { exception: "moodle_exception", errorcode: "servicenotavailable", message: "Synthetic outage" },
    503,
    { "retry-after": "1" },
  )

