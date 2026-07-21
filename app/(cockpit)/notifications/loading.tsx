import { Skeleton, Surface } from "@/components/ui";

export default function NotificationsLoading() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="notifications-loading-title"
      className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 md:px-8"
    >
      <header className="grid gap-3">
        <h1
          className="m-0 text-[length:var(--font-size-h1)] font-semibold leading-tight tracking-[-0.028em]"
          id="notifications-loading-title"
        >
          Notifications
        </h1>
        <p className="m-0 text-[length:var(--font-size-body-lg)] text-ink-muted">
          Loading your Moodle updates…
        </p>
      </header>
      <Surface variant="base">
        <div aria-hidden className="grid gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Surface>
    </main>
  );
}
