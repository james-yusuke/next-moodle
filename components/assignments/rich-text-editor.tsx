"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  LinkSimple,
  ListBullets,
  Quotes,
  TextB,
  TextHTwo,
  TextItalic,
} from "@phosphor-icons/react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { AiCompletionExtension, aiCompletionPluginKey } from "./ai-completion-extension";
import type { WritingCursorContext, WritingEditorHandle } from "./writing-editor-types";

type RichTextEditorProps = Readonly<{
  candidate: string;
  disabled: boolean;
  initialContent: string;
  onAcceptCandidate: () => void;
  onChange: (html: string) => void;
  onComposingChange: (value: boolean) => void;
  onCursorContext: (value: WritingCursorContext) => void;
  onDiscardCandidate: () => void;
}>;

export const RichTextEditor = forwardRef<WritingEditorHandle, RichTextEditorProps>(
function RichTextEditor(props, ref) {
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  }, [props]);

  const reportCursor = (current: NonNullable<ReturnType<typeof useEditor>>) => {
    const { from, to } = current.state.selection;
    const size = current.state.doc.content.size;
    latest.current.onCursorContext({
      afterCursor: current.state.doc.textBetween(to, size, "\n"),
      beforeCursor: current.state.doc.textBetween(0, from, "\n"),
      hasSelection: from !== to,
      selectedText: from === to ? "" : current.state.doc.textBetween(from, to, "\n"),
    });
  };

  const editor = useEditor({
    content: props.initialContent,
    editable: !props.disabled,
    extensions: [
      AiCompletionExtension,
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["http", "https", "mailto"] },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      handleDOMEvents: {
        compositionend: () => {
          latest.current.onComposingChange(false);
          return false;
        },
        compositionstart: () => {
          latest.current.onComposingChange(true);
          return false;
        },
      },
      handleKeyDown: (view, event) => {
        if (latest.current.candidate === "") return false;
        if (event.key === "Escape") {
          event.preventDefault();
          latest.current.onDiscardCandidate();
          return true;
        }
        if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
          return false;
        }
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(latest.current.candidate));
        latest.current.onAcceptCandidate();
        return true;
      },
    },
    onSelectionUpdate: ({ editor: current }) => reportCursor(current),
    onUpdate: ({ editor: current }) => {
      latest.current.onChange(current.getHTML());
      reportCursor(current);
    },
  });

  useImperativeHandle(ref, () => ({
    insertText: (value) => editor?.chain().focus().command(({ tr }) => {
      tr.insertText(value);
      return true;
    }).run() ?? false,
    undo: () => editor?.chain().focus().undo().run() ?? false,
  }), [editor]);

  useEffect(() => {
    if (editor === null) return;
    editor.setEditable(!props.disabled);
  }, [editor, props.disabled]);

  useEffect(() => {
    if (editor === null || editor.getHTML() === props.initialContent) return;
    editor.commands.setContent(props.initialContent, { emitUpdate: false });
  }, [editor, props.initialContent]);

  useEffect(() => {
    if (editor === null) return;
    editor.view.dispatch(editor.state.tr.setMeta(aiCompletionPluginKey, props.candidate));
  }, [editor, props.candidate]);

  useEffect(() => {
    if (editor !== null) reportCursor(editor);
  }, [editor]);

  if (editor === null) return <div className="ui-editor ui-editor--loading">エディターを読み込み中…</div>;

  const setLink = () => {
    const current = editor.getAttributes("link")["href"];
    const href = window.prompt("リンク先URL", typeof current === "string" ? current : "https://");
    if (href === null) return;
    if (href.trim() === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  const tools = [
    { label: "見出し", icon: TextHTwo, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "太字", icon: TextB, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "斜体", icon: TextItalic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "リンク", icon: LinkSimple, active: editor.isActive("link"), run: setLink },
    { label: "箇条書き", icon: ListBullets, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "引用", icon: Quotes, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "元に戻す", icon: ArrowCounterClockwise, active: false, run: () => editor.chain().focus().undo().run() },
    { label: "やり直す", icon: ArrowClockwise, active: false, run: () => editor.chain().focus().redo().run() },
  ] as const;

  return (
    <div className="ui-editor" data-disabled={props.disabled}>
      <div aria-label="文章編集ツール" className="ui-editor__toolbar" role="toolbar">
        {tools.map(({ active, icon: Icon, label, run }) => (
          <button aria-label={label} aria-pressed={active} disabled={props.disabled} key={label} onClick={run} type="button">
            <Icon aria-hidden size={18} weight="regular" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
