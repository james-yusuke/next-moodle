import { Skeleton } from "@/components/ui";

export default function NotificationsLoading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="notifications-loading-title"
      className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 md:px-8"
    >
      <header className="grid gap-3">
        <h1
          className="m-0 text-[length:var(--font-size-h1)] font-semibold leading-tight tracking-[-0.028em]"
          id="notifications-loading-title"
        >
          通知
        </h1>
        <p className="m-0 text-[length:var(--font-size-body-lg)] text-ink-muted">
          Moodleから最新のお知らせを読み込んでいます…
        </p>
      </header>
      <div className="border-y border-[var(--border-default)] py-5">
        <div aria-hidden className="grid gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </section>
  );
}
