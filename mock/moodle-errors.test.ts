import { expect, test } from "bun:test"

import { createMoodleMock } from "./moodle-server"

const stringField = (value: unknown, key: string): string | undefined => {
  if (typeof value !== "object" || value === null) return undefined
  for (const [candidateKey, candidate] of Object.entries(value)) {
    if (candidateKey === key && typeof candidate === "string") return candidate
  }
  return undefined
}

const login = async (baseUrl: string, username: string, password: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/login/token.php`, {
    method: "POST",
    body: new URLSearchParams({ username, password, service: "moodle_mobile_app" }),
  })
  return stringField(await response.json(), "token") ?? ""
}

test("invalid credentials return the official token error shape", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const response = await fetch(`${server.url}/login/token.php`, {
      method: "POST",
      body: new URLSearchParams({ username: "alice", password: "wrong", service: "moodle_mobile_app" }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(stringField(body, "errorcode")).toBe("invalidlogin")
  } finally {
    await mock.stop()
  }
})

test("expired token returns a Moodle exception without revealing credentials", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const token = await login(server.url, "alice", "alice-password")
    const response = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "expired_token" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "core_webservice_get_site_info",
        moodlewsrestformat: "json",
      }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(stringField(body, "errorcode")).toBe("invalidtoken")
    expect(JSON.stringify(body)).not.toContain("alice-password")
  } finally {
    await mock.stop()
  }
})

test("capability omission is visible in site info and function response", async () => {
  const mock = createMoodleMock({ missingFunctions: ["mod_assign_get_assignments"] })
  const server = await mock.start()
  try {
    const token = await login(server.url, "alice", "alice-password")
    const infoResponse = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" }),
    })
    const info = await infoResponse.json()
    const functions = typeof info === "object" && info !== null && "functions" in info ? info.functions : []
    expect(JSON.stringify(functions)).not.toContain("mod_assign_get_assignments")

    const assignmentResponse = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      body: new URLSearchParams({ wstoken: token, wsfunction: "mod_assign_get_assignments" }),
    })
    expect(stringField(await assignmentResponse.json(), "errorcode")).toBe("accessexception")
  } finally {
    await mock.stop()
  }
})

test("empty data, warnings, exception, malformed body, and outage are deterministic", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const token = await login(server.url, "alice", "alice-password")
    const emptyResponse = await fetch(`${server.url}/webservice/rest/server.php?scenario=empty_data`, {
      method: "POST",
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_enrol_get_users_courses" }),
    })
    expect(await emptyResponse.json()).toEqual([])

    const warningResponse = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "warning" },
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" }),
    })
    expect(JSON.stringify(await warningResponse.json())).toContain("mock_warning")

    const exceptionResponse = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "moodle_exception" },
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" }),
    })
    expect(stringField(await exceptionResponse.json(), "errorcode")).toBe("syntheticfailure")

    const malformedResponse = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "malformed_response" },
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" }),
    })
    expect(await malformedResponse.text()).toBe('{"exception":"malformed_fixture"')

    const outageBody = new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" })
    const outage = await fetch(`${server.url}/webservice/rest/server.php?scenario=transient_outage`, {
      method: "POST",
      body: outageBody,
    })
    expect(outage.status).toBe(503)
    const retry = await fetch(`${server.url}/webservice/rest/server.php?scenario=transient_outage`, {
      method: "POST",
      body: new URLSearchParams({ wstoken: token, wsfunction: "core_webservice_get_site_info" }),
    })
    expect(retry.status).toBe(200)
  } finally {
    await mock.stop()
  }
})
