import { Skeleton, Surface } from "@/components/ui";

export function PageLoading({ label }: Readonly<{ label: string }>) {
  return (
    <div aria-busy="true" aria-label={label} className="ui-page-stack" role="status">
      <span className="ui-sr-only">{label}</span>
      <div className="ui-page-loading__heading">
        <Skeleton className="ui-page-loading__title" />
        <Skeleton className="ui-page-loading__copy" />
      </div>
      <div className="ui-page-grid">
        <Surface><Skeleton className="ui-page-loading__panel" /></Surface>
        <Surface><Skeleton className="ui-page-loading__panel" /></Surface>
      </div>
    </div>
  );
}
