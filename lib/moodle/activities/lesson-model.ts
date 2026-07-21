import type { SanitizedQuizHtml } from "@/lib/security/html";

export type LessonActivityData = Readonly<{
  completed: boolean;
  content: SanitizedQuizHtml;
  id: number;
  name: string;
  pageId: number | null;
  progress: number | null;
}>;

export function extractLessonResponseNames(html: string): readonly string[] {
  const names = new Set<string>();
  const pattern = /\bname=(["'])([a-z][a-z0-9_\[\]-]{0,79})\1/gi;
  for (const match of html.matchAll(pattern)) {
    const name = match[2];
    if (name !== undefined) names.add(name);
  }
  return [...names];
}
