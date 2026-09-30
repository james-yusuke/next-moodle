import styles from "./rich-content.module.css";
import type { ReactNode } from "react";

import type { MoodleDocument, MoodleHtmlNode } from "@/lib/moodle/html";
import { QuizResponseEditor } from "@/components/activities/quiz-response-editor";
import { classNames } from "./class-names";

type RichContentVariant = "default" | "quiz";

const quizClasses = classNames(
  styles.quizClasses1!,
  styles.quizClasses2!,
  styles.quizClasses3!,
  styles.quizClasses4!,
  styles.quizClasses5!,
  styles.quizClasses6!,
  styles.quizClasses7!,
  styles.quizClasses8!,
  styles.quizClasses9!,
  styles.quizClasses10!,
  styles.quizClasses11!,
  styles.quizClasses12!,
  styles.quizClasses13!,
);

function renderNodes(nodes: readonly MoodleHtmlNode[], variant: RichContentVariant, onInput?: () => void): ReactNode {
  return nodes.map((node, index) => onInput === undefined
    ? <RichNode key={index} node={node} variant={variant} />
    : <RichNode key={index} node={node} onInput={onInput} variant={variant} />);
}

function tableSections(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableHead" || node.kind === "tableBody");
}

function tableRows(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableRow");
}

function tableCells(nodes: readonly MoodleHtmlNode[]): readonly MoodleHtmlNode[] {
  return nodes.filter((node) => node.kind === "tableCell");
}

function RichNode({ node, onInput, variant }: Readonly<{ node: MoodleHtmlNode; onInput?: () => void; variant: RichContentVariant }>): ReactNode {
  switch (node.kind) {
    case "text": return node.value;
    case "break": return <br />;
    case "paragraph": return <p>{renderNodes(node.children, variant, onInput)}</p>;
    case "heading": return node.level === 2 ? <h2>{renderNodes(node.children, variant, onInput)}</h2> : node.level === 3 ? <h3>{renderNodes(node.children, variant, onInput)}</h3> : <h4>{renderNodes(node.children, variant, onInput)}</h4>;
    case "blockquote": return <blockquote>{renderNodes(node.children, variant, onInput)}</blockquote>;
    case "pre": return <pre>{renderNodes(node.children, variant, onInput)}</pre>;
    case "div": return <div className={node.className}>{renderNodes(node.children, variant, onInput)}</div>;
    case "span": return <span className={node.className}>{renderNodes(node.children, variant, onInput)}</span>;
    case "strong": return <strong>{renderNodes(node.children, variant, onInput)}</strong>;
    case "em": return <em>{renderNodes(node.children, variant, onInput)}</em>;
    case "strike": return <s>{renderNodes(node.children, variant, onInput)}</s>;
    case "code": return <code>{renderNodes(node.children, variant, onInput)}</code>;
    case "label": return <label className={node.className} htmlFor={node.htmlFor}>{renderNodes(node.children, variant, onInput)}</label>;
    case "link": return <a href={node.href} {...(node.external ? { rel: "noopener noreferrer", target: "_blank" } : {})} title={node.title}>{renderNodes(node.children, variant, onInput)}</a>;
    // Moodle's protected files are fetched via the authenticated BFF proxy, so
    // Next image optimization cannot safely fetch them at build time.
    // eslint-disable-next-line @next/next/no-img-element
    case "image": return <img alt={node.alt} height={node.height} src={node.src} title={node.title} width={node.width} />;
    case "list": return node.ordered ? <ol>{renderNodes(node.items, variant, onInput)}</ol> : <ul>{renderNodes(node.items, variant, onInput)}</ul>;
    case "listItem": return <li>{renderNodes(node.children, variant, onInput)}</li>;
    case "table": return <table>{renderNodes(tableSections(node.children), variant, onInput)}</table>;
    case "tableHead": return <thead>{renderNodes(tableRows(node.children), variant, onInput)}</thead>;
    case "tableBody": return <tbody>{renderNodes(tableRows(node.children), variant, onInput)}</tbody>;
    case "tableRow": return <tr>{renderNodes(tableCells(node.children), variant, onInput)}</tr>;
    case "tableCell": return node.heading ? <th colSpan={node.colSpan} rowSpan={node.rowSpan} scope={node.scope}>{renderNodes(node.children, variant, onInput)}</th> : <td colSpan={node.colSpan} rowSpan={node.rowSpan}>{renderNodes(node.children, variant, onInput)}</td>;
    case "input": return <input aria-label={node.inputType === "hidden" || node.id !== undefined ? undefined : "回答"} className={node.className} defaultChecked={node.checked} defaultValue={node.value} disabled={node.disabled} id={node.id} max={node.max} maxLength={node.maxLength} min={node.min} name={node.name} step={node.step} type={node.inputType} />;
    case "select": {
      const values = node.options.filter((option) => option.selected).map((option) => option.value);
      return <select aria-label={node.id === undefined ? "回答を選択" : undefined} defaultValue={node.multiple ? values : values[0]} disabled={node.disabled} id={node.id} multiple={node.multiple} name={node.name}>{node.options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    case "textarea": {
      if (variant === "quiz") {
        return onInput === undefined
          ? <QuizResponseEditor node={node} />
          : <QuizResponseEditor node={node} onChange={() => onInput()} />;
      }
      return <textarea aria-label={node.id === undefined ? "回答" : undefined} className={styles.richTextarea!} cols={node.cols} data-editor="moodle-response" defaultValue={node.value} disabled={node.disabled} id={node.id} maxLength={node.maxLength} name={node.name} rows={node.rows ?? 8} spellCheck wrap="soft" />;
    }
    case "button": return <button className={node.className} data-quiz-action={node.action} type="button">{renderNodes(node.children, variant, onInput)}</button>;
  }
}

export function RichContent({ className, document, onInput, variant = "default" }: Readonly<{ className?: string | undefined; document: MoodleDocument; onInput?: () => void; variant?: RichContentVariant }>) {
  return (
    <div
      className={classNames(
        styles.richContent!,
        styles.style1!,
        styles.style2!,
        styles.style3!,
        styles.style4!,
        styles.style5!,
        styles.style6!,
        styles.style7!,
        styles.style8!,
        variant === "quiz" && quizClasses,
        className,
      )}
    >
      {renderNodes(document.nodes, variant, onInput)}
    </div>
  );
}
