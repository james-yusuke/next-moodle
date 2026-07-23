import { describe, expect, test } from "bun:test";

import { dispositionForMoodlePageFailure } from "./page-failure";

describe("Moodle page failure disposition", () => {
  test("sends explicit permission failures to the forbidden boundary", () => {
    expect(dispositionForMoodlePageFailure("permission")).toBe("forbidden");
  });

  test("keeps authentication and capability failures recoverable", () => {
    expect(dispositionForMoodlePageFailure("auth_expired")).toBe("reauthenticate");
    expect(dispositionForMoodlePageFailure("capability")).toBe("capability");
  });

  test("sends outages and invalid responses to the error boundary", () => {
    expect(dispositionForMoodlePageFailure("outage")).toBe("error");
    expect(dispositionForMoodlePageFailure("invalid_response")).toBe("error");
  });
});
