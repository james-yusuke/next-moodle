import { expect, test } from "bun:test"

import { createMoodleMock } from "./moodle-server"

test("token and site info flow returns an authenticated synthetic user", async () => {
  const mock = createMoodleMock()
  const server = await mock.start()

  try {
    const login = await fetch(`${server.url}/login/token.php`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: "alice",
        password: "alice-password",
        service: "moodle_mobile_app",
      }),
    })

    expect(login.status).toBe(200)
    const tokenBody: unknown = await login.json()
    const token =
      tokenBody !== null &&
      typeof tokenBody === "object" &&
      "token" in tokenBody &&
      typeof tokenBody.token === "string"
        ? tokenBody.token
        : ""
    expect(token).toBe("mock-token-alice")

    const siteInfo = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "core_webservice_get_site_info",
        moodlewsrestformat: "json",
      }),
    })

    expect(siteInfo.status).toBe(200)
    expect(await siteInfo.json()).toMatchObject({
      userid: 101,
      username: "alice",
      fullname: "Aoi Tanaka",
    })

    const secondAssignmentStatus = await fetch(`${server.url}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        wstoken: token,
        wsfunction: "mod_assign_get_submission_status",
        moodlewsrestformat: "json",
        assignid: "502",
      }),
    })
    const secondAssignment: unknown = await secondAssignmentStatus.json()
    expect(JSON.stringify(secondAssignment)).toContain('"format":1')
  } finally {
    await mock.stop()
  }
})
