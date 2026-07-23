import sanitizeHtmlLibrary from "sanitize-html";
import { z } from "zod";

import { moodleFileProxyPath } from "./moodle-file";

const MoodleHtmlSchema = z.string().max(1_000_000);
const SanitizedHtmlSchema = z.string().brand("SanitizedMoodleHtml");
export type SanitizedMoodleHtml = z.infer<typeof SanitizedHtmlSchema>;
const SanitizedQuizHtmlSchema = z.string().brand("SanitizedQuizHtml");
export type SanitizedQuizHtml = z.infer<typeof SanitizedQuizHtmlSchema>;

type SanitizeMoodleHtmlOptions = Readonly<{
  siteUrl: string;
}>;

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;

const MESSAGE_BLOCK_END_TAG = /<\/(?:blockquote|div|h[1-6]|li|p|pre|tr)\s*>/gi;
const MESSAGE_LINE_BREAK_TAG = /<br\s*\/?\s*>/gi;

/**
 * Moodle messages can contain HTML even when the surrounding API describes the
 * value as text. Messages are intentionally rendered as plain text: this keeps
 * conversation rows compact and prevents untrusted markup from becoming UI.
 */
export function plainTextFromMoodleMessage(value: string): string {
  const input = MoodleHtmlSchema.parse(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&LT;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&GT;", ">")
    .replace(MESSAGE_LINE_BREAK_TAG, "\n")
    .replace(MESSAGE_BLOCK_END_TAG, "\n");
  const text = sanitizeHtmlLibrary(input, {
    allowedAttributes: {},
    allowedTags: [],
    disallowedTagsMode: "discard",
  });
  return text
    .replaceAll("\u00a0", " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function safeMoodleLink(value: string, siteUrl: string): string | null {
  if (!URL.canParse(value, `${siteUrl}/`)) {
    return null;
  }
  const url = new URL(value, `${siteUrl}/`);
  if (url.username !== "" || url.password !== "") {
    return null;
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    return url.toString();
  }
  if (url.protocol === "mailto:") {
    return url.toString();
  }
  return null;
}

function safeProtectedFile(value: string, siteUrl: string): string | null {
  const resolved = safeMoodleLink(value, siteUrl);
  return resolved === null ? null : moodleFileProxyPath(resolved, siteUrl);
}

function embeddedContentLink(value: string, siteUrl: string): string | null {
  const resolved = safeMoodleLink(value, siteUrl);
  if (resolved === null) return null;
  const candidate = new URL(resolved);
  const site = new URL(siteUrl);
  if (candidate.origin !== site.origin) return resolved;
  const id = Number(candidate.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (candidate.pathname === "/course/view.php") return `/courses/${id}`;
  const moduleName = /^\/mod\/([a-z0-9_]+)\/view\.php$/.exec(candidate.pathname)?.[1];
  if (moduleName === undefined) return null;
  return moduleName === "assign" ? `/assignments/${id}` : `/activities/${id}`;
}

function linkAttributes(href: string, title: string | undefined): Record<string, string> {
  return {
    href,
    ...(href.startsWith("/") ? {} : { rel: "noopener noreferrer", target: "_blank" }),
    ...(title === undefined ? {} : { title }),
  };
}

export function sanitizeMoodleHtml(
  value: string,
  options: SanitizeMoodleHtmlOptions,
): SanitizedMoodleHtml {
  const input = MoodleHtmlSchema.parse(value);
  const sanitized = sanitizeHtmlLibrary(input, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        const rawHref = attributes.href;
        if (rawHref === undefined) {
          return { tagName: "span", attribs: {} };
        }
        const protectedHref = safeProtectedFile(rawHref, options.siteUrl);
        const href = protectedHref ?? embeddedContentLink(rawHref, options.siteUrl);
        if (href === null) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "a",
          attribs: linkAttributes(href, attributes.title),
        };
      },
      img: (_tagName, attributes) => {
        const src =
          attributes.src === undefined
            ? null
            : safeProtectedFile(attributes.src, options.siteUrl);
        if (src === null) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "img",
          attribs: {
            src,
            alt: attributes.alt ?? "",
            ...(attributes.title === undefined ? {} : { title: attributes.title }),
            ...(attributes.width === undefined ? {} : { width: attributes.width }),
            ...(attributes.height === undefined ? {} : { height: attributes.height }),
          },
        };
      },
    },
  });
  return SanitizedHtmlSchema.parse(sanitized);
}

const QUIZ_CONTROL_TAGS = ["button", "input", "label", "select", "option", "textarea"] as const;
const QUIZ_INPUT_TYPES = new Set(["checkbox", "hidden", "number", "radio", "text"]);

function isQuizClearControl(attributes: Record<string, string>): boolean {
  const value = attributes.value ?? "";
  const name = attributes.name ?? "";
  return /clear|選択.*クリア|クリア.*選択/i.test(`${name} ${value}`);
}

export function sanitizeQuizQuestionHtml(
  value: string,
  options: SanitizeMoodleHtmlOptions,
): SanitizedQuizHtml {
  const input = MoodleHtmlSchema.parse(value);
  const sanitized = sanitizeHtmlLibrary(input, {
    allowedTags: [...ALLOWED_TAGS, ...QUIZ_CONTROL_TAGS, "div", "span"],
    allowedAttributes: {
      "*": ["class"],
      a: ["href", "title"],
      button: ["class", "data-quiz-action", "type"],
      img: ["src", "alt", "title", "width", "height"],
      input: ["checked", "disabled", "id", "max", "maxlength", "min", "name", "step", "type", "value"],
      label: ["for"],
      option: ["disabled", "selected", "value"],
      select: ["disabled", "id", "multiple", "name"],
      textarea: ["cols", "disabled", "id", "maxlength", "name", "rows"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        const href = attributes.href === undefined
          ? null
          : embeddedContentLink(attributes.href, options.siteUrl);
        return href === null
          ? { tagName: "span", attribs: {} }
          : { tagName: "a", attribs: linkAttributes(href, attributes.title) };
      },
      img: (_tagName, attributes) => {
        const src = attributes.src === undefined
          ? null
          : safeProtectedFile(attributes.src, options.siteUrl);
        return src === null
          ? { tagName: "span", attribs: {} }
          : { tagName: "img", attribs: { src, alt: attributes.alt ?? "" } };
      },
      input: (_tagName, attributes) => {
        if (attributes.type?.toLowerCase() === "submit") {
          if (isQuizClearControl(attributes)) {
            return {
              tagName: "button",
              attribs: { class: attributes.class ?? "", "data-quiz-action": "clear", type: "button" },
              text: attributes.value ?? "選択をクリア",
            };
          }
          return { tagName: "span", attribs: {} };
        }
        const type = QUIZ_INPUT_TYPES.has(attributes.type ?? "text")
          ? (attributes.type ?? "text")
          : "text";
        return { tagName: "input", attribs: { ...attributes, type } };
      },
      button: () => ({ tagName: "span", attribs: {} }),
    },
  });
  return SanitizedQuizHtmlSchema.parse(sanitized);
}
