import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const aiCompletionPluginKey = new PluginKey<string>("ai-completion");

export const AiCompletionExtension = Extension.create({
  name: "aiCompletion",
  addProseMirrorPlugins() {
    return [
      new Plugin<string>({
        key: aiCompletionPluginKey,
        state: {
          init: () => "",
          apply: (transaction, value) => {
            const next = transaction.getMeta(aiCompletionPluginKey);
            return typeof next === "string" ? next : value;
          },
        },
        props: {
          decorations(state) {
            const candidate = aiCompletionPluginKey.getState(state) ?? "";
            if (candidate === "" || !state.selection.empty) return DecorationSet.empty;
            const widget = Decoration.widget(state.selection.from, () => {
              const span = document.createElement("span");
              span.className = "ui-ai-ghost";
              span.setAttribute("aria-hidden", "true");
              span.textContent = candidate;
              return span;
            }, { side: 1 });
            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});
