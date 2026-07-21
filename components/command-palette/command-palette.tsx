"use client";

import {
  ArrowRight,
  BookOpen,
  MagnifyingGlass,
  SquaresFour,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui";
import { searchCommands, type CommandItem } from "./search";
import "./command-palette.css";

type CommandPaletteProps = Readonly<{
  commands: readonly CommandItem[];
}>;

export function CommandPalette({ commands }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const titleId = useId();
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);

  const openPalette = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("en") === "k") {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openPalette]);

  const choose = (command: CommandItem) => {
    setOpen(false);
    router.push(command.href);
  };

  return (
    <>
      <Button
        aria-label="移動・検索"
        className="ui-command-trigger"
        icon={<MagnifyingGlass aria-hidden size={18} weight="regular" />}
        onClick={openPalette}
        variant="secondary"
      >
        <span>移動・検索</span>
        <kbd>⌘K</kbd>
      </Button>
      <dialog
        aria-labelledby={titleId}
        aria-modal="true"
        className="ui-command-dialog"
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <div className="ui-command-panel">
          <h2 className="ui-sr-only" id={titleId}>画面とコースを検索</h2>
          <label className="ui-command-search" htmlFor={`${listId}-input`}>
            <MagnifyingGlass aria-hidden size={20} weight="regular" />
            <span className="ui-sr-only">検索語</span>
            <input
              aria-activedescendant={
                results[selectedIndex] === undefined
                  ? undefined
                  : `${listId}-option-${selectedIndex}`
              }
              aria-controls={listId}
              aria-expanded="true"
              autoComplete="off"
              id={`${listId}-input`}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const selected = results[selectedIndex];
                  if (selected !== undefined) {
                    choose(selected);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder="画面名、コース名、略称"
              ref={inputRef}
              role="combobox"
              value={query}
            />
            <kbd>Esc</kbd>
          </label>
          <div className="ui-command-results" id={listId} role="listbox">
            {results.length === 0 ? (
              <p className="ui-command-empty">一致する画面やコースはありません。</p>
            ) : results.map((command, index) => (
              <button
                aria-selected={selectedIndex === index}
                className="ui-command-option"
                id={`${listId}-option-${index}`}
                key={`${command.kind}-${command.href}`}
                onClick={() => choose(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                type="button"
              >
                {command.kind === "course" ? (
                  <BookOpen aria-hidden size={20} weight="regular" />
                ) : (
                  <SquaresFour aria-hidden size={20} weight="regular" />
                )}
                <span>{command.label}</span>
                <small>{command.kind === "course" ? "コース" : "画面"}</small>
                <ArrowRight aria-hidden size={17} weight="regular" />
              </button>
            ))}
          </div>
          <p className="ui-command-help">上下キーで選択、Enterで移動、Escapeで閉じます。</p>
        </div>
      </dialog>
    </>
  );
}
