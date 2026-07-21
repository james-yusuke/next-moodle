import { expect, test } from "bun:test"

import { createMoodleMock } from "./moodle-server"

const stringField = (value: unknown, key: string): string | undefined => {
  if (typeof value !== "object" || value === null) return undefined
  for (const [candidateKey, candidate] of Object.entries(value)) {
    if (candidateKey === key && typeof candidate === "string") return candidate
  }
  return undefined
}

const numberField = (value: unknown, key: string): number | undefined => {
  if (typeof value !== "object" || value === null) return undefined
  for (const [candidateKey, candidate] of Object.entries(value)) {
    if (candidateKey === key && typeof candidate === "number") return candidate
  }
  return undefined
}

const booleanField = (value: unknown, key: string): boolean | undefined => {
  if (typeof value !== "object" || value === null) return undefined
  for (const [candidateKey, candidate] of Object.entries(value)) {
    if (candidateKey === key && typeof candidate === "boolean") return candidate
  }
  return undefined
}

const login = async (baseUrl: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/login/token.php`, {
    method: "POST",
    body: new URLSearchParams({ username: "alice", password: "alice-password" }),
  })
  return stringField(await response.json(), "token") ?? ""
}

test("upload draft, save submission, and optional grading submission preserve wire order", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const token = await login(server.url)
    const form = new FormData()
    form.set("token", token)
    form.set("itemid", "7000")
    form.set("filearea", "draft")
    form.append("file", new File(["synthetic draft"], "draft note.txt", { type: "text/plain" }))
    const upload = await fetch(`${server.url}/webservice/upload.php`, { method: "POST", body: form })
    const uploadBody: unknown = await upload.json()
    const firstItem = Array.isArray(uploadBody) ? uploadBody[0] : undefined
    expect(upload.status).toBe(200)
    expect(numberField(firstItem, "itemid")).toBe(7000)
    expect(stringField(firstItem, "filename")).toBe("draft_note.txt")

    const save = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "save_submission" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "mod_assign_save_submission",
        assignmentid: "501",
        "plugindata[onlinetext_editor][text]": "Synthetic field notes",
      }),
    })
    expect(save.status).toBe(200)
    expect(booleanField(await save.json(), "status")).toBe(true)

    const submit = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "submit_for_grading" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "mod_assign_submit_for_grading",
        assignmentid: "501",
      }),
    })
    expect(submit.status).toBe(200)
    expect(booleanField(await submit.json(), "status")).toBe(true)
    expect(mock.state.uploadItems.get(7000)?.user).toBe("alice")
    expect(mock.state.submissions.get("alice:501")?.submitted).toBe(true)
  } finally {
    await mock.stop()
  }
})

test("notification read state and protected files remain user-isolated", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()
  try {
    const token = await login(server.url)
    const countRequest = new URLSearchParams({
      wstoken: token,
      wsfunction: "message_popup_get_unread_popup_notification_count",
    })
    const before = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      body: countRequest,
    })
    expect(await before.json()).toBe(1)

    const mark = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "x-mock-moodle-scenario": "notification_read" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "core_message_mark_notification_read",
        notificationid: "701",
      }),
    })
    expect(mark.status).toBe(200)
    const after = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      body: countRequest,
    })
    expect(await after.json()).toBe(0)

    const file = await fetch(
      `${server.url}/webservice/pluginfile.php/123/mod_assign/intro/501/field-notes.pdf?token=${token}`,
    )
    expect(file.status).toBe(200)
    expect(file.headers.get("cache-control")).toBe("private, no-store")
    expect(await file.text()).toContain("Synthetic protected file for alice")

    const denied = await fetch(
      `${server.url}/webservice/pluginfile.php/123/mod_assign/intro/501/field-notes.pdf?token=${token}`,
      { headers: { "x-mock-moodle-scenario": "protected_file" } },
    )
    expect(denied.status).toBe(403)

    const bobTokenResponse = await fetch(`${server.url}/login/token.php`, {
      method: "POST",
      body: new URLSearchParams({ username: "bob", password: "bob-password" }),
    })
    const bobToken = stringField(await bobTokenResponse.json(), "token") ?? ""
    const crossUser = await fetch(
      `${server.url}/webservice/pluginfile.php/123/mod_assign/intro/501/field-notes.pdf?token=${bobToken}`,
    )
    expect(crossUser.status).toBe(403)
  } finally {
    await mock.stop()
  }
})
