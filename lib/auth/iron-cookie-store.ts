import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { cookies } from "next/headers";

import { MoodleConfigurationError } from "../moodle/errors";

type NextCookieStore = Awaited<ReturnType<typeof cookies>>;

export class IronCookieStoreAdapter {
  constructor(private readonly store: NextCookieStore) {}

  get(name: string): { readonly name: string; readonly value: string } | undefined {
    const cookie = this.store.get(name);
    if (cookie === undefined) {
      return undefined;
    }
    return { name: cookie.name, value: cookie.value };
  }

  set(name: string, value: string, options?: Partial<ResponseCookie>): void;
  set(options: ResponseCookie): void;
  set(
    nameOrOptions: string | ResponseCookie,
    value?: string,
    options?: Partial<ResponseCookie>,
  ): void {
    if (typeof nameOrOptions !== "string") {
      this.store.set(nameOrOptions);
      return;
    }
    if (value === undefined) {
      throw new MoodleConfigurationError();
    }
    if (options === undefined) {
      this.store.set(nameOrOptions, value);
      return;
    }
    this.store.set(nameOrOptions, value, options);
  }
}
