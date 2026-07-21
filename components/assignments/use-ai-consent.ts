"use client";

import { useCallback, useEffect, useState } from "react";

export type AiConsentState = "loading" | "granted" | "required";
const AI_CONSENT_CHANGE_EVENT = "next-moodle:ai-consent-change";

export function useAiConsent(storageKey: string): Readonly<{
  grant: () => void;
  revoke: () => void;
  state: AiConsentState;
}> {
  const [state, setState] = useState<AiConsentState>("loading");

  useEffect(() => {
    const sync = (): void => {
      setState(window.localStorage.getItem(storageKey) === "granted" ? "granted" : "required");
    };
    const task = window.setTimeout(
      sync,
      0,
    );
    window.addEventListener("storage", sync);
    window.addEventListener(AI_CONSENT_CHANGE_EVENT, sync);
    return () => {
      window.clearTimeout(task);
      window.removeEventListener("storage", sync);
      window.removeEventListener(AI_CONSENT_CHANGE_EVENT, sync);
    };
  }, [storageKey]);

  const grant = useCallback(() => {
    window.localStorage.setItem(storageKey, "granted");
    setState("granted");
    window.dispatchEvent(new Event(AI_CONSENT_CHANGE_EVENT));
  }, [storageKey]);

  const revoke = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setState("required");
    window.dispatchEvent(new Event(AI_CONSENT_CHANGE_EVENT));
  }, [storageKey]);

  return { grant, revoke, state };
}
