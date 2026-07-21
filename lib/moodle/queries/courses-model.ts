import type {
  MoodleCourseModule,
  MoodleDashboardCourse,
} from "@/lib/moodle/server";

export type CourseClassification = "active" | "future" | "past";

export type CourseListItem = {
  readonly classification: CourseClassification;
  readonly endDate?: number;
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly startDate?: number;
};

export type CourseModuleWithUrl = MoodleCourseModule & {
  readonly url?: string | undefined;
};

export type ActivityDestination =
  | { readonly kind: "internal"; readonly href: string }
  | { readonly kind: "external"; readonly href: string }
  | {
      readonly kind: "disabled";
      readonly reason: "hidden" | "url_unavailable";
    };

export function classifyCourse(
  course: MoodleDashboardCourse,
  nowSeconds: number,
): CourseClassification {
  if (course.enddate !== undefined && course.enddate > 0 && course.enddate < nowSeconds) {
    return "past";
  }
  if (course.startdate !== undefined && course.startdate > nowSeconds) {
    return "future";
  }
  return "active";
}

export function projectCourseList(
  courses: readonly MoodleDashboardCourse[],
  nowSeconds: number,
): readonly CourseListItem[] {
  return courses
    .filter((course) => course.visible !== 0)
    .map((course): CourseListItem => {
      const dates = {
        ...(course.startdate === undefined ? {} : { startDate: course.startdate }),
        ...(course.enddate === undefined ? {} : { endDate: course.enddate }),
      };
      return {
        classification: classifyCourse(course, nowSeconds),
        id: course.id,
        name: course.fullname,
        shortName: course.shortname,
        ...dates,
      };
    })
    .sort((left, right) => {
      const order: Readonly<Record<CourseClassification, number>> = {
        active: 0,
        future: 1,
        past: 2,
      };
      return order[left.classification] - order[right.classification] ||
        left.name.localeCompare(right.name, "ja");
    });
}

export function filterCourseItems(
  courses: readonly CourseListItem[],
  query: string,
): readonly CourseListItem[] {
  const normalized = query.normalize("NFKC").trim().toLocaleLowerCase("ja");
  if (normalized === "") {
    return courses;
  }
  return courses.filter((course) =>
    `${course.name} ${course.shortName}`
      .normalize("NFKC")
      .toLocaleLowerCase("ja")
      .includes(normalized),
  );
}

function safeMoodleUrl(url: string, siteUrl: string): string | null {
  try {
    const candidate = new URL(url);
    const site = new URL(siteUrl);
    const sitePath = site.pathname.endsWith("/") ? site.pathname : `${site.pathname}/`;
    const candidatePath = candidate.pathname.startsWith("/")
      ? candidate.pathname
      : `/${candidate.pathname}`;
    const hasToken = [...candidate.searchParams.keys()].some((key) =>
      key.toLocaleLowerCase("en").includes("token"),
    );
    if (
      candidate.origin !== site.origin ||
      !candidatePath.startsWith(sitePath) ||
      candidate.username !== "" ||
      candidate.password !== "" ||
      hasToken
    ) {
      return null;
    }
    return candidate.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

export function activityDestination(
  module: CourseModuleWithUrl,
  siteUrl: string,
): ActivityDestination {
  if (module.visible === 0 || module.uservisible === false) {
    return { kind: "disabled", reason: "hidden" };
  }
  if (module.modname === "assign") {
    return { kind: "internal", href: `/assignments/${module.id}` };
  }
  if (module.url === undefined) {
    return { kind: "disabled", reason: "url_unavailable" };
  }
  const href = safeMoodleUrl(module.url, siteUrl);
  return href === null
    ? { kind: "disabled", reason: "url_unavailable" }
    : { kind: "external", href };
}
