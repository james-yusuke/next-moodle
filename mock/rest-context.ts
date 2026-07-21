import type {
  FixtureUser,
  MoodleMockOptions,
  MoodleMockState,
  MoodleScenario,
  MockRequestInput,
} from "./types";

export type RestContext = Readonly<{
  input: MockRequestInput;
  options: MoodleMockOptions;
  scenario: MoodleScenario;
  siteUrl: string;
  state: MoodleMockState;
  user: FixtureUser;
}>;
