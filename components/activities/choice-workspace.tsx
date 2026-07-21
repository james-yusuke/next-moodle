"use client";

import { CheckCircle } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";
import type { ChoiceActivityData } from "@/lib/moodle/activities/choice";

export function ChoiceWorkspace({ cmid, data }: Readonly<{ cmid: number; data: ChoiceActivityData }>) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(data.options.filter((option) => option.checked).map((option) => option.id)));
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");

  function change(id: number, checked: boolean): void {
    setSelected((current) => {
      if (!data.allowMultiple) return checked ? new Set([id]) : new Set();
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (state === "pending" || selected.size === 0) return;
    setState("pending");
    const response = await ky.post(`/api/activities/${cmid}/choice`, {
      json: { responses: [...selected] }, retry: 0, throwHttpErrors: false,
    });
    setState(response.ok ? "success" : "error");
    if (response.ok) router.refresh();
  }

  return (
    <form className="ui-choice" onSubmit={(event) => void submit(event)}>
      <header><div><span className="ui-kicker">Choice</span><h2>{data.name}</h2></div>{selected.size > 0 ? <span>{selected.size}件を選択</span> : null}</header>
      <fieldset><legend className="ui-sr-only">選択肢</legend>{data.options.map((option) => <label data-selected={selected.has(option.id)} key={option.id}><input checked={selected.has(option.id)} disabled={option.disabled || (option.checked && !data.allowUpdate)} name="choice" onChange={(event) => change(option.id, event.currentTarget.checked)} type={data.allowMultiple ? "checkbox" : "radio"} value={option.id} /><span><strong>{option.text}</strong><small>{option.countanswers}件の回答</small></span></label>)}</fieldset>
      <footer><Button disabled={state === "pending" || selected.size === 0} type="submit">{state === "pending" ? "送信中" : data.options.some((option) => option.checked) ? "回答を更新" : "回答を送信"}</Button><span aria-live="polite">{state === "success" ? <><CheckCircle aria-hidden size={16} />保存しました</> : state === "error" ? "保存できませんでした。" : ""}</span></footer>
    </form>
  );
}
