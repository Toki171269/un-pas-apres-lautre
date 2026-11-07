import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { api } from "../lib/api.js";
import { Notice, PageHead, errText } from "../components/ui.jsx";

export function Manage() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [post, setPost] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [deleted, setDeleted] = useState(false);

  const call = async (op, extra = {}) => {
    setBusy(true); setMsg(null);
    try { return await api("manage", { code, op, ...extra }); }
    catch (err) { setMsg({ kind: "error", text: errText(t, err) }); return null; }
    finally { setBusy(false); }
  };
  const find = async (e) => {
    e.preventDefault();
    const res = await call("get");
    if (res?.post) { setPost(res.post); setForm({ title: res.post.title, body: res.post.body, allow_replies: res.post.allow_replies }); }
  };
  const save = async () => {
    const res = await call("update", form);
    if (res) { setPost({ ...post, ...form, status: res.status }); setMsg({ kind: res.status === "rejected" ? "error" : "ok", text: res.status === "visible" ? t("manage.saved") : t(`moderation.${res.status}`) }); }
  };
  const remove = async () => {
    if (!window.confirm(t("manage.confirm"))) return;
    const res = await call("delete");
    if (res?.deleted) { setDeleted(true); setPost(null); }
  };

  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("manage.title")} lead={t("manage.lead")} />
      {deleted && <Notice kind="ok">{t("manage.deleted")}</Notice>}
      {!post && !deleted && (
        <form onSubmit={find} className="card flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label htmlFor="code" className="label">{t("manage.code")}</label>
            <input id="code" className="field font-mono tracking-wider" autoComplete="off" spellCheck="false" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("manage.codePh")} />
          </div>
          <button className="btn btn-hope" disabled={busy || code.replace(/[^a-z0-9]/gi, "").length < 20}>{t("manage.find")}</button>
        </form>
      )}
      {post && form && (
        <div className="card grid gap-4">
          <p className="text-sm">{t("manage.status." + post.status)} · {post.reply_count} {t("post.repliesTitle").toLowerCase()}
            {post.status === "visible" && <> · <Link to={`/histoire/${post.id}`}>{t("publish.view")}</Link></>}</p>
          <div>
            <label htmlFor="mt" className="label">{t("publish.titleLabel")}</label>
            <input id="mt" className="field" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="mb" className="label">{t("publish.bodyLabel")}</label>
            <textarea id="mb" className="field" rows={10} maxLength={6000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allow_replies} onChange={(e) => setForm({ ...form, allow_replies: e.target.checked })} className="h-4 w-4 accent-[var(--hope)]" />
            {t("publish.allowReplies")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-hope" onClick={save} disabled={busy}>{t("manage.save")}</button>
            <button className="btn btn-line border-danger text-danger" onClick={remove} disabled={busy}>{t("manage.delete")}</button>
          </div>
        </div>
      )}
      {msg && <div className="mt-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </div>
  );
}

export function Charter() {
  const { t } = useI18n();
  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("charter.title")} lead={t("charter.intro")} />
      <ul className="mb-6 grid gap-2">
        {t("charter.items").map((it) => <li key={it} className="card flex gap-3 py-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-hope" />{it}</li>)}
      </ul>
      <Notice>{t("charter.moderation")}</Notice>
    </div>
  );
}

export function Privacy() {
  const { t } = useI18n();
  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("privacy.title")} />
      <div className="grid gap-4">
        {t("privacy.sections").map((s) => <section key={s.h} className="card"><h2 className="mb-2 text-lg">{s.h}</h2><p className="text-muted">{s.p}</p></section>)}
      </div>
    </div>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return <div className="wrap py-16"><Notice>{t("notFound")}</Notice><Link to="/" className="btn btn-hope mt-4">{t("nav.home")}</Link></div>;
}
