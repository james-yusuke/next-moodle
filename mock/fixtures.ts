import { ALICE_FIXTURE } from "./fixtures-alice"
import { BOB_FIXTURE } from "./fixtures-bob"
import type { FixtureUser, FixtureUserKey } from "./types"

export const FIXTURE_USERS: Readonly<Record<FixtureUserKey, FixtureUser>> = {
  alice: ALICE_FIXTURE,
  bob: BOB_FIXTURE,
}

export const FIXTURE_TOKENS: Readonly<Record<FixtureUserKey, string>> = {
  alice: "mock-token-alice",
  bob: "mock-token-bob",
}

