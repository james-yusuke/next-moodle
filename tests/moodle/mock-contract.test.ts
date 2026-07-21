import { expect, test } from "bun:test";

import { authenticateWithMoodle } from "../../lib/moodle/auth";
import {
  createMoodleConfig,
  MoodleCredentialsSchema,
  MoodleUserIdSchema,
} from "../../lib/moodle/model";
import { FIXTURE_USERS } from "../../mock/fixtures";
import { createMoodleMock } from "../../mock/moodle-server";

test("authenticates against the shared official-wire Moodle fixture", async () => {
  // Given
  const mock = createMoodleMock();
  const server = await mock.start();
  const user = FIXTURE_USERS.alice;
  const config = createMoodleConfig({ baseUrl: server.url });
  const credentials = MoodleCredentialsSchema.parse({
    username: user.username,
    password: user.password,
  });

  try {
    // When
    const login = await authenticateWithMoodle(config, credentials);

    // Then
    expect(login.userId).toBe(MoodleUserIdSchema.parse(user.userid));
    expect(login.site.siteUrl).toBe(server.url);
    expect(login.manifest.features.dashboard).toBe("available");
    expect(login.manifest.features.courses).toBe("available");
    expect(login.manifest.features.assignmentsRead).toBe("available");
    expect(login.manifest.features.calendar).toBe("available");
    expect(login.manifest.features.notifications).toBe("available");
    expect(login.manifest.fileAccess.upload).toBe(true);
  } finally {
    await mock.stop();
  }
});
