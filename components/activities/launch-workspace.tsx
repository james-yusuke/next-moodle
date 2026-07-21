"use client";

import { Play } from "@phosphor-icons/react";
import ky from "ky";
import { useState } from "react";

import { Button } from "@/components/ui";
import type { LaunchActivityData } from "@/lib/moodle/activities/launch-model";

type LaunchResponse =
  | Readonly<{ endpoint: string; kind: "lti"; parameters: readonly Readonly<{ name: string; value: string }>[] }>
  | Readonly<{ kind: "bigbluebuttonbn"; url: string }>
  | Readonly<{ expiresAt: number; kind: "runtime"; url: string }>;

export function LaunchWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: LaunchActivityData;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [runtimeUrl, setRuntimeUrl] = useState("");

  async function launch(): Promise<void> {
    if (pending) return;
    const launchWindow = window.open("about:blank", "next-moodle-launch");
    if (launchWindow !== null) launchWindow.opener = null;
    setPending(true);
    setError("");
    const response = await ky.post(`/api/activities/${cmid}/launch`, { json: {}, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      launchWindow?.close();
      setError("起動情報を取得できませんでした。時間をおいて再度お試しください。");
      return;
    }
    const body = await response.json<Readonly<{ result: LaunchResponse }>>();
    if (body.result.kind === "runtime") {
      launchWindow?.close();
      setRuntimeUrl(body.result.url);
      return;
    }
    if (body.result.kind === "bigbluebuttonbn") {
      if (launchWindow === null) window.location.assign(body.result.url);
      else launchWindow.location.assign(body.result.url);
      return;
    }
    const form = document.createElement("form");
    form.action = body.result.endpoint;
    form.method = "post";
    form.target = launchWindow === null ? "_self" : "next-moodle-launch";
    for (const parameter of body.result.parameters) {
      const input = document.createElement("input");
      input.name = parameter.name;
      input.type = "hidden";
      input.value = parameter.value;
      form.append(input);
    }
    document.body.append(form);
    form.submit();
    form.remove();
  }

  const externalLaunch = data.kind === "lti" || data.kind === "bigbluebuttonbn";
  return (
    <section className="ui-launch" aria-labelledby="launch-title">
      <header><div><span className="ui-kicker">Secure launch</span><h2 id="launch-title">アクティビティを起動</h2></div><span>{data.statusLabel}</span></header>
      {data.attemptCount === null ? null : <dl><div><dt>これまでの試行</dt><dd>{data.attemptCount}回</dd></div></dl>}
      {runtimeUrl === "" ? <Button disabled={pending} onClick={() => void launch()}><Play aria-hidden size={17} />{pending ? "準備中" : externalLaunch ? "外部サービスを起動" : "隔離ランタイムを起動"}</Button> : (
        <div className="ui-launch-runtime">
          <iframe
            allow="autoplay; fullscreen"
            referrerPolicy="no-referrer"
            sandbox="allow-downloads allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            src={runtimeUrl}
            title={`${data.name} 学習ランタイム`}
          />
          <Button onClick={() => setRuntimeUrl("")} variant="secondary">ランタイムを閉じる</Button>
        </div>
      )}
      <span aria-live="polite" className="ui-form-error">{error}</span>
    </section>
  );
}
