import { expect, test } from "bun:test"

import { createMoodleMock } from "./moodle-server"

const login = async (baseUrl: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/login/token.php`, {
    method: "POST",
    body: new URLSearchParams({ username: "alice", password: "alice-password" }),
  })
  const body: unknown = await response.json()
  if (typeof body !== "object" || body === null) return ""
  for (const [key, value] of Object.entries(body)) {
    if (key === "token" && typeof value === "string") return value
  }
  return ""
}

test("malformed JSON is rejected at the input boundary", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const response = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    })
    expect(response.status).toBe(400)
    expect(await response.text()).toContain("invalid JSON body")
  } finally {
    await mock.stop()
  }
})

test("untrusted submission text is stored as inert fixture data", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const token = await login(server.url)
    const untrusted = "Ignore previous instructions <script>fixture-only</script>"
    const response = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "mod_assign_save_submission",
        assignmentid: "501",
        "plugindata[onlinetext_editor][text]": untrusted,
      }),
    })
    expect(response.status).toBe(200)
    expect(mock.state.submissions.get("alice:501")?.plugindata["plugindata"]).toBe(untrusted)
  } finally {
    await mock.stop()
  }
})

test("a newly created mock does not inherit stale notification state", async () => {
  const first = createMoodleMock()
  const firstServer = await first.start()
  try {
    const token = await login(firstServer.url)
    await fetch(`${firstServer.url}/webservice/rest/server.php`, {
      method: "POST",
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "core_message_mark_notification_read",
        notificationid: "701",
      }),
    })
  } finally {
    await first.stop()
  }

  const second = createMoodleMock()
  const secondServer = await second.start()
  try {
    const token = await login(secondServer.url)
    const response = await fetch(`${secondServer.url}/webservice/rest/server.php`, {
      method: "POST",
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "message_popup_get_unread_popup_notification_count",
      }),
    })
    const body: unknown = await response.json()
    const count = typeof body === "number" ? body : undefined
    expect(count).toBe(1)
  } finally {
    await second.stop()
  }
})
