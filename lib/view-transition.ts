/**
 * Chrome 153 adds a visibility reason to the InvalidStateError raised by a
 * skipped View Transition. React 19.2 recognizes the same error only when its
 * message has no suffix, so normalize that one recoverable browser condition
 * before React receives it. All other errors retain their original shape.
 */
export const VIEW_TRANSITION_BOOTSTRAP_SCRIPT = String.raw`
(() => {
  const nativeStart = document.startViewTransition;
  if (typeof nativeStart !== "function" || nativeStart.__nextMoodleVisibilityGuard === true) return;

  const normalizeReadyError = (error) => {
    if (error === null || typeof error !== "object" || error.name !== "InvalidStateError") return error;
    const message = typeof error.message === "string" ? error.message : "";
    const normalized = message.toLowerCase();
    const isHiddenDocumentAbort =
      message.startsWith("Transition was aborted because of invalid state") &&
      (normalized.includes("document hidden") ||
        normalized.includes("document is hidden") ||
        normalized.includes("visibility state is hidden"));

    return isHiddenDocumentAbort
      ? new DOMException("Transition was aborted because of invalid state", "InvalidStateError")
      : error;
  };

  const guardedStart = function (...args) {
    const transition = nativeStart.apply(this, args);
    const ready = transition.ready.catch((error) => {
      throw normalizeReadyError(error);
    });

    return new Proxy(transition, {
      get(target, property) {
        if (property === "ready") return ready;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };

  Object.defineProperty(guardedStart, "__nextMoodleVisibilityGuard", { value: true });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: guardedStart,
    writable: true,
  });
})();
`;
