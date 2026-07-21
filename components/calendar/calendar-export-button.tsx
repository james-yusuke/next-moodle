"use client";

import { DownloadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui";
import { generateIcs, type IcsEvent } from "@/lib/calendar/ics";

export function CalendarExportButton({ events }: Readonly<{ events: readonly IcsEvent[] }>) {
  const save = () => {
    const blob = new Blob([generateIcs(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = "learning-calendar.ics";
    anchor.href = url;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <Button disabled={events.length === 0} icon={<DownloadSimple aria-hidden size={18} />} onClick={save} type="button" variant="secondary">
      .ics保存
    </Button>
  );
}
