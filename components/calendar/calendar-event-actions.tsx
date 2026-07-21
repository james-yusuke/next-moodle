"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field } from "@/components/ui";

export function CalendarEventCreator() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const startsAt = form.get("startsAt");
    if (typeof startsAt !== "string" || startsAt === "") return;
    setPending(true);
    setError(false);
    try {
      const response = await ky.post("/api/calendar/events", {
        json: { name: form.get("name"), startsAt: new Date(startsAt).toISOString() },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      formElement.reset();
      router.refresh();
    } catch (cause) {
      if (!isKyError(cause)) throw cause;
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <details className="ui-calendar-create"><summary><Plus aria-hidden size={17} />予定を追加</summary><form onSubmit={submit}><Field id="calendar-event-name" label="予定名" maxLength={200} name="name" required /><Field id="calendar-event-start" label="開始日時" name="startsAt" required type="datetime-local" /><Button disabled={pending} type="submit">{pending ? "追加中" : "追加"}</Button><span aria-live="polite">{error ? "予定を追加できませんでした。" : ""}</span></form></details>;
}

export function CalendarEventDelete({ eventId }: Readonly<{ eventId: number }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove(): Promise<void> {
    if (pending || !window.confirm("この予定を削除しますか？")) return;
    setPending(true);
    try {
      const response = await ky.delete(`/api/calendar/events/${eventId}`, { retry: 0, throwHttpErrors: false });
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }
  return <button aria-label="予定を削除" className="ui-calendar-delete" disabled={pending} onClick={remove} type="button"><Trash aria-hidden size={16} /></button>;
}
