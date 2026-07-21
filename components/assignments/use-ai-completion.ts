"use client";

import ky, { isKyError } from "ky";
import { useEffect, useState } from "react";

import type { AiTextFormat } from "@/lib/ai/contracts";
import { completionIsEligible, streamCompletionNdjson } from "./ai-client";

type CompletionHookInput = Readonly<{
  afterCursor: string;
  beforeCursor: string;
  cmid: number;
  consented: boolean;
  enabled: boolean;
  format: AiTextFormat;
  hasSelection: boolean;
  isComposing: boolean;
  submitting: boolean;
}>;

export type AiCompletionState = Readonly<{
  candidate: string;
  clear: () => void;
  errorCode: string | null;
  status: "idle" | "waiting" | "ready" | "error";
}>;

type StoredCompletionState = Readonly<{
  candidate: string;
  errorCode: string | null;
  key: string;
  status: AiCompletionState["status"];
}>;

export function useAiCompletion(input: CompletionHookInput): AiCompletionState {
  const {
    afterCursor,
    beforeCursor,
    cmid,
    consented,
    enabled,
    format,
    hasSelection,
    isComposing,
    submitting,
  } = input;
  const requestKey = `${cmid}\u0000${format}\u0000${beforeCursor}\u0000${afterCursor}`;
  const [stored, setStored] = useState<StoredCompletionState>({
    candidate: "",
    errorCode: null,
    key: "",
    status: "idle",
  });

  useEffect(() => {
    if (!completionIsEligible({
      beforeCursor,
      consented,
      enabled,
      hasSelection,
      isComposing,
      submitting,
    })) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const run = async () => {
        setStored({ candidate: "", errorCode: null, key: requestKey, status: "waiting" });
        try {
          const response = await ky.post(`/api/assignments/${cmid}/ai/completion`, {
            json: {
              afterCursor,
              beforeCursor,
              format,
            },
            headers: { "x-ai-consent": "1" },
            retry: 0,
            signal: controller.signal,
            throwHttpErrors: false,
            timeout: false,
          });
          let nextCandidate = "";
          for await (const event of streamCompletionNdjson(response)) {
            switch (event.type) {
              case "delta":
                nextCandidate += event.delta;
                setStored({ candidate: nextCandidate, errorCode: null, key: requestKey, status: "ready" });
                break;
              case "done":
                setStored({ candidate: nextCandidate, errorCode: null, key: requestKey, status: nextCandidate === "" ? "idle" : "ready" });
                break;
              case "error":
                setStored({ candidate: "", errorCode: event.error.code, key: requestKey, status: "error" });
                break;
            }
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          if (isKyError(error) || error instanceof SyntaxError || error instanceof Error) {
            setStored({ candidate: "", errorCode: "ai_unavailable", key: requestKey, status: "error" });
            return;
          }
          throw error;
        }
      };
      void run();
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    afterCursor,
    beforeCursor,
    cmid,
    consented,
    enabled,
    format,
    hasSelection,
    isComposing,
    requestKey,
    submitting,
  ]);

  const current = stored.key === requestKey
    ? stored
    : { candidate: "", errorCode: null, key: requestKey, status: "idle" as const };

  return {
    candidate: current.candidate,
    clear: () => {
      setStored({ candidate: "", errorCode: null, key: requestKey, status: "idle" });
    },
    errorCode: current.errorCode,
    status: current.status,
  };
}
