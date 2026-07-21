import { FIXTURE_TOKENS, FIXTURE_USERS } from "./fixtures"
import { firstField, MockInputError, numberField, readMockRequestInput } from "./params"
import { handleRestFunction } from "./rest"
import { invalidLogin, jsonResponse, malformedResponse, moodleException, transientOutage } from "./responses"
import { MOODLE_FUNCTIONS } from "./types"
import type {
  FixtureUser,
  MoodleFunction,
  MoodleMockOptions,
  MoodleMockState,
  MockRequestInput,
  MoodleScenario,
} from "./types"

const isScenario = (value: string | undefined): value is MoodleScenario =>
  value !== undefined && MOODLE_SCENARIOS_SET.has(value)

const MOODLE_SCENARIOS_SET = new Set<string>([
  "success",
  "invalid_credentials",
  "expired_token",
  "missing_capability",
  "empty_data",
  "warning",
  "moodle_exception",
  "transient_outage",
  "malformed_response",
  "protected_file",
  "upload_draft",
  "save_submission",
  "submit_for_grading",
  "notification_read",
])

const functionFor = (value: string | undefined): MoodleFunction | undefined => {
  if (value === undefined) return undefined
  for (const functionName of MOODLE_FUNCTIONS) {
    if (functionName === value) return functionName
  }
  return undefined
}

const scenarioFor = (
  request: Request,
  input: MockRequestInput,
  options: MoodleMockOptions,
): MoodleScenario => {
  const urlScenario = new URL(request.url).searchParams.get("scenario") ?? undefined
  const headerScenario = request.headers.get("x-mock-moodle-scenario") ?? undefined
  const fieldScenario = firstField(input, "mock_scenario")
  return (isScenario(headerScenario) && headerScenario) ||
    (isScenario(urlScenario) && urlScenario) ||
    (isScenario(fieldScenario) && fieldScenario) ||
    options.defaultScenario ||
    "success"
}

const userForCredentials = (username: string | undefined, password: string | undefined): FixtureUser | undefined => {
  if (username === undefined || password === undefined) return undefined
  const normalized = username.trim().toLowerCase()
  for (const user of Object.values(FIXTURE_USERS)) {
    const aliases = [user.username, `${user.username}@synthetic.invalid`, `student-${user.key}`, user.key]
    if (aliases.includes(normalized) && user.password === password) return user
  }
  return undefined
}

const userForToken = (input: MockRequestInput, state: MoodleMockState): FixtureUser | undefined => {
  const token = firstField(input, "wstoken", "token")
  const userKey = token === undefined ? undefined : state.tokens.get(token)
  return userKey === undefined ? undefined : FIXTURE_USERS[userKey]
}

const outageResponse = (state: MoodleMockState, key: string): Response | undefined => {
  const attempt = (state.outageAttempts.get(key) ?? 0) + 1
  state.outageAttempts.set(key, attempt)
  return attempt === 1 ? transientOutage() : undefined
}

const loginEndpoint = (
  input: MockRequestInput,
  state: MoodleMockState,
  scenario: MoodleScenario,
): Response => {
  if (scenario === "malformed_response") return malformedResponse()
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, "login")
    if (outage !== undefined) return outage
  }
  if (scenario === "invalid_credentials") return invalidLogin()
  const user = userForCredentials(firstField(input, "username"), firstField(input, "password"))
  if (user === undefined) return invalidLogin()
  const token = FIXTURE_TOKENS[user.key]
  state.tokens.set(token, user.key)
  return jsonResponse({ token, privatetoken: `private-${user.key}`, userid: user.userid, service: "moodle_mobile_app" })
}

const missingCapability = (functionName: string): Response =>
  moodleException(
    "webservice_access_exception",
    "accessexception",
    `The function ${functionName} is not available for this synthetic user.`,
  )

const restEndpoint = async (
  request: Request,
  input: MockRequestInput,
  state: MoodleMockState,
  options: MoodleMockOptions,
  scenario: MoodleScenario,
): Promise<Response> => {
  const functionName = functionFor(firstField(input, "wsfunction"))
  if (functionName === undefined) {
    return moodleException("invalid_parameter_exception", "invalidparameter", "Unknown wsfunction.")
  }
  if (scenario === "malformed_response") return malformedResponse()
  const user = userForToken(input, state)
  if (scenario === "expired_token") {
    return moodleException("moodle_exception", "invalidtoken", "The synthetic token has expired.")
  }
  if (user === undefined) {
    return moodleException("moodle_exception", "invalidtoken", "Invalid or missing synthetic token.")
  }
  if (scenario === "missing_capability" || options.missingFunctions?.includes(functionName)) {
    return missingCapability(functionName)
  }
  if (scenario === "moodle_exception") {
    return moodleException("moodle_exception", "syntheticfailure", "Synthetic Moodle exception.")
  }
  if (scenario === "transient_outage") {
    const token = firstField(input, "wstoken") ?? "anonymous"
    const outage = outageResponse(state, `rest:${token}:${functionName}`)
    if (outage !== undefined) return outage
  }
  const payload = handleRestFunction(functionName, {
    input,
    state,
    user,
    options,
    scenario,
    siteUrl: new URL(request.url).origin,
  })
  return jsonResponse(payload)
}

const uploadEndpoint = (
  input: MockRequestInput,
  state: MoodleMockState,
  scenario: MoodleScenario,
): Response => {
  if (scenario === "malformed_response") return malformedResponse()
  const userKey = firstField(input, "token")
  const user = userKey === undefined ? undefined : state.tokens.get(userKey)
  if (scenario === "expired_token" || user === undefined) {
    return moodleException("moodle_exception", "invalidtoken", "Invalid or expired synthetic token.")
  }
  if (scenario === "moodle_exception") {
    return moodleException("moodle_exception", "filetransferfailed", "Synthetic upload failure.")
  }
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, `upload:${userKey}`)
    if (outage !== undefined) return outage
  }
  const file = input.files[0]
  if (file === undefined) return jsonResponse({ error: "missing file" }, 400)
  const requestedItemid = numberField(input, "itemid")
  const itemid = requestedItemid ?? state.nextDraftItemId++
  if (requestedItemid !== undefined && requestedItemid >= state.nextDraftItemId) {
    state.nextDraftItemId = requestedItemid + 1
  }
  const filename = file.name.replace(/[^A-Za-z0-9._-]/g, "_") || "upload.bin"
  const item = {
    itemid,
    filename,
    filepath: "/",
    filesize: file.size,
    mimetype: file.type,
  } as const
  state.uploadItems.set(itemid, { ...item, user, itemid })
  return jsonResponse([item])
}

const fileEndpoint = (request: Request, state: MoodleMockState, scenario: MoodleScenario): Response => {
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""
  const userKey = state.tokens.get(token)
  const user = userKey === undefined ? undefined : FIXTURE_USERS[userKey]
  if (user === undefined) {
    return moodleException("webservice_access_exception", "invalidtoken", "Protected file requires a valid token.", 401)
  }
  if (scenario === "protected_file") {
    return moodleException("webservice_access_exception", "nopermissions", "Protected file denied.", 403)
  }
  if (scenario === "malformed_response") return malformedResponse()
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, `file:${token}:${url.pathname}`)
    if (outage !== undefined) return outage
  }
  const assignment = user.assignments.find((candidate) => url.pathname.includes(`/${candidate.id}/`))
  if (assignment === undefined || !url.pathname.includes("mod_assign")) {
    return moodleException("webservice_access_exception", "nopermissions", "Protected file denied.", 403)
  }
  const rawName = url.pathname.split("/").pop() ?? "download.bin"
  const filename = decodeURIComponent(rawName).replace(/[^A-Za-z0-9._-]/g, "_") || "download.bin"
  const bytes = new TextEncoder().encode(`Synthetic protected file for ${user.key}; assignment ${assignment.id}.\n`)
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  })
}

export const handleMoodleRequest = async (
  request: Request,
  state: MoodleMockState,
  options: MoodleMockOptions,
): Promise<Response> => {
  const path = new URL(request.url).pathname.replace(/\/$/, "") || "/"
  try {
    const input = await readMockRequestInput(request)
    const scenario = scenarioFor(request, input, options)
    if (path === "/login/token.php") return loginEndpoint(input, state, scenario)
    if (path === "/webservice/rest/server.php") return restEndpoint(request, input, state, options, scenario)
    if (path === "/webservice/upload.php") return uploadEndpoint(input, state, scenario)
    if (path === "/webservice/pluginfile.php" || path.startsWith("/webservice/pluginfile.php/")) {
      return fileEndpoint(request, state, scenario)
    }
    return jsonResponse({ error: "unknown mock Moodle endpoint" }, 404)
  } catch (error) {
    if (error instanceof MockInputError) return jsonResponse({ error: error.message }, 400)
    throw error
  }
}
