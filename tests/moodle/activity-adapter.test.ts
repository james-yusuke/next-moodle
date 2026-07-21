import { describe, expect, test } from "bun:test";

import { deriveCapabilityManifest } from "@/lib/moodle/capabilities";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { resolveActivityAdapter } from "@/lib/moodle/activities/registry";
import { CompanionManifestSchema } from "@/lib/moodle/activities/contracts";

describe("activity adapter registry", () => {
  test("Given official quiz functions, When resolved, Then the quiz stays inside the workspace", () => {
    const manifest = deriveCapabilityManifest({
      fileAccess: { download: true, upload: true },
      functionNames: [
        MOODLE_FUNCTIONS.quizzes,
        MOODLE_FUNCTIONS.quizAttempts,
        MOODLE_FUNCTIONS.startQuizAttempt,
        MOODLE_FUNCTIONS.quizAttemptData,
        MOODLE_FUNCTIONS.saveQuizAttempt,
        MOODLE_FUNCTIONS.processQuizAttempt,
        MOODLE_FUNCTIONS.quizAttemptReview,
      ],
    });

    const resolution = resolveActivityAdapter("quiz", manifest);

    expect(resolution.kind).toBe("native");
    if (resolution.kind === "native") {
      expect(resolution.adapter.workspace).toBe("assessment");
      expect(resolution.adapter.operations).toContain("submit");
    }
  });

  test("Given a custom module, When resolved, Then arbitrary HTML is never treated as native", () => {
    const manifest = deriveCapabilityManifest({
      fileAccess: { download: true, upload: false },
      functionNames: [],
    });

    const resolution = resolveActivityAdapter("mod_customlab", manifest);

    expect(resolution).toEqual({
      kind: "adapter_required",
      moduleName: "mod_customlab",
    });
  });

  test("uses a declared companion adapter only for its registered module", () => {
    const manifest = deriveCapabilityManifest({
      companion: {
        adapters: [{ moduleName: "quiz", operations: ["read", "submit"] }],
        contractVersion: 2,
      },
      fileAccess: { download: true, upload: false },
      functionNames: [
        MOODLE_FUNCTIONS.activityAdapter,
        MOODLE_FUNCTIONS.adapterManifest,
      ],
    });

    expect(resolveActivityAdapter("quiz", manifest).kind).toBe("adapter_required");
    expect(manifest.companionModules).toEqual(["quiz"]);
    expect(CompanionManifestSchema.parse({
      contractversion: 2,
      adapters: [{ modulename: "quiz", operations: ["read", "submit"] }],
    }).adapters[0]?.moduleName).toBe("quiz");
  });

  test("requires every companion v2 function before declaring complete replacement readiness", () => {
    const partial = deriveCapabilityManifest({
      companion: { adapters: [], contractVersion: 2 },
      fileAccess: { download: true, upload: true },
      functionNames: [MOODLE_FUNCTIONS.adapterManifest, MOODLE_FUNCTIONS.activityAdapter],
      requireCompanion: true,
    });
    const complete = deriveCapabilityManifest({
      companion: { adapters: [], contractVersion: 2 },
      fileAccess: { download: true, upload: true },
      functionNames: [
        MOODLE_FUNCTIONS.adapterManifest,
        MOODLE_FUNCTIONS.adapterBranding,
        MOODLE_FUNCTIONS.activityAdapter,
        MOODLE_FUNCTIONS.executeActivityAction,
        MOODLE_FUNCTIONS.createRuntimeTicket,
      ],
      requireCompanion: true,
    });

    expect(partial.replacementReady).toBe(false);
    expect(complete.replacementReady).toBe(true);
  });

  test("Given Moodle 4.5 forum functions, When capabilities are derived, Then forum reading is available", () => {
    const manifest = deriveCapabilityManifest({
      fileAccess: { download: true, upload: true },
      functionNames: [
        MOODLE_FUNCTIONS.forums,
        MOODLE_FUNCTIONS.forumDiscussions,
        MOODLE_FUNCTIONS.forumDiscussionPosts,
      ],
    });

    expect(manifest.features.forums).toBe("available");
    expect(manifest.operations["forum.read"]).toBe("available");
    expect(manifest.operations["forum.reply"]).toBe("unavailable");
  });
});
