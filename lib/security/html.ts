import sanitizeHtmlLibrary from "sanitize-html";
import { z } from "zod";

import { moodleFileProxyPath } from "./moodle-file";

const MoodleHtmlSchema = z.string().max(1_000_000);
const SanitizedHtmlSchema = z.string().brand("SanitizedMoodleHtml");
export type SanitizedMoodleHtml = z.infer<typeof SanitizedHtmlSchema>;

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
        const href = protectedHref ?? safeMoodleLink(rawHref, options.siteUrl);
        if (href === null) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "a",
          attribs: {
            href,
            rel: "noopener noreferrer",
            target: "_blank",
            ...(attributes.title === undefined ? {} : { title: attributes.title }),
          },
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
