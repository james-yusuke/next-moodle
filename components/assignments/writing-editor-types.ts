export type WritingCursorContext = Readonly<{
  afterCursor: string;
  beforeCursor: string;
  hasSelection: boolean;
  selectedText: string;
}>;

export type WritingEditorHandle = Readonly<{
  insertText: (value: string) => boolean;
  undo: () => boolean;
}>;
