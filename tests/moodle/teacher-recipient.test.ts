import { describe, expect, test } from "bun:test";

import {
  openTeacherRecipientKey,
  sealTeacherRecipientKey,
} from "@/lib/moodle/messages/teacher-recipient";

const secret = "fixture-session-password-at-least-32-bytes";
const nonce = new Uint8Array(12).fill(7);

describe("teacher recipient keys", () => {
  test("round-trips an opaque, expiring recipient without exposing Moodle ids", () => {
    const key = sealTeacherRecipientKey({
      courseId: 101,
      expiresAt: 1_700_000_600,
      nonce,
      recipientId: 808,
      secret,
      siteUrl: "https://moodle.example.invalid",
      viewerId: 42,
    });

    expect(key).not.toContain("808");
    expect(key).not.toContain("101");
    expect(openTeacherRecipientKey({
      courseId: 101,
      key,
      nowSeconds: 1_700_000_000,
      secret,
      siteUrl: "https://moodle.example.invalid",
      viewerId: 42,
    })).toEqual({ recipientId: 808 });
  });

  test("rejects another viewer, course, site, expired key, and tampering", () => {
    const key = sealTeacherRecipientKey({
      courseId: 101,
      expiresAt: 1_700_000_600,
      nonce,
      recipientId: 808,
      secret,
      siteUrl: "https://moodle.example.invalid",
      viewerId: 42,
    });

    expect(openTeacherRecipientKey({ courseId: 101, key, nowSeconds: 1_700_000_000, secret, siteUrl: "https://moodle.example.invalid", viewerId: 43 })).toBeNull();
    expect(openTeacherRecipientKey({ courseId: 102, key, nowSeconds: 1_700_000_000, secret, siteUrl: "https://moodle.example.invalid", viewerId: 42 })).toBeNull();
    expect(openTeacherRecipientKey({ courseId: 101, key, nowSeconds: 1_700_000_000, secret, siteUrl: "https://other.example.invalid", viewerId: 42 })).toBeNull();
    expect(openTeacherRecipientKey({ courseId: 101, key, nowSeconds: 1_700_000_601, secret, siteUrl: "https://moodle.example.invalid", viewerId: 42 })).toBeNull();
    expect(openTeacherRecipientKey({ courseId: 101, key: `${key.slice(0, -1)}x`, nowSeconds: 1_700_000_000, secret, siteUrl: "https://moodle.example.invalid", viewerId: 42 })).toBeNull();
  });
});
