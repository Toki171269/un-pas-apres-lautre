import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { api } from "../lib/api.js";
import { CATEGORIES, REACTIONS, REPORT_REASONS } from "../lib/data.js";
import { excerpt, remembered, timeAgo } from "../lib/util.js";
import { Dialog, errText } from "./ui.jsx";

export function CategorySelect({ value, onChange, id, withAll, allLabel }) {
  const { t } = useI18n();
  return (
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {withAll && <option value="">{allLabel}</option>}
      {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
    </select>
  );
}

const supports = (p) => REACTIONS.reduce((n, r) => n + (p[`r_${r}`] || 0), 0);

export function PostCard({ post }) {
  const { t, lang } = useI18n();
  const n = supports(post);
  return (
    <article className="card flex flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span><strong className="font-head text-ink">{post.pseudo}</strong> · {timeAgo(post.created_at, t, lang)}</span>
        <span className="font-head text-xs font-bold uppercase tracking-wide text-hope-text">
          {post.kind === "hope" ? t("space.espoir.name") : t(`cat.${post.category}`)}
        </span>
      </div>
      <h3 className="mb-2 text-lg">
        <Link to={`/histoire/${post.id}`} className="text-ink no-underline hover:text-hope-text">{post.title}</Link>
      </h3>
      <p className="mb-4 whitespace-pre-line text-muted" style={{ overflowWrap: "anywhere" }}>{excerpt(post.body)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
        <span>{t("community.supports", { n })}</span>
        <span>{post.reply_count ? t("community.replies", { n: post.reply_count }) : t("community.noReply")}</span>
        <Link to={`/histoire/${post.id}`} className="ml-auto font-head font-bold">{t("community.readStory")}</Link>
      </div>
    </article>
  );
}

const reacted = remembered("upa-reactions");
export function Reactions({ post }) {
  const { t } = useI18n();
  const [counts, setCounts] = useState(() => Object.fromEntries(REACTIONS.map((r) => [r, post[`r_${r}`] || 0])));
  const [, force] = useState(0);
  const send = async (r) => {
    const key = `${post.id}:${r}`;
    if (reacted.has(key)) return;
    reacted.add(key);
    setCounts((c) => ({ ...c, [r]: c[r] + 1 }));
    force((x) => x + 1);
    try { await api("react", { post_id: post.id, type: r }); } catch { /* le compteur local suffit */ }
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("post.supportTitle")}>
      {REACTIONS.map((r) => {
        const done = reacted.has(`${post.id}:${r}`);
        return (
          <button key={r} onClick={() => send(r)} aria-pressed={done}
            className={`rounded-ui border px-3 py-1.5 text-sm font-semibold ${done ? "border-hope bg-hope-soft text-hope-text" : "border-line hover:border-muted"}`}>
            {t(`reaction.${r}`)}{counts[r] ? <span className="ml-1.5 text-muted">{counts[r]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const reportedItems = remembered("upa-reports");
export function ReportButton({ type, id, className = "" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState(reportedItems.has(id) ? "done" : "idle");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setState("sending"); setError("");
    try {
      await api("report", { target_type: type, target_id: id, reason, details });
      reportedItems.add(id);
      setState("done");
    } catch (err) { setError(errText(t, err)); setState("idle"); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={`text-xs text-muted hover:text-danger ${className}`} disabled={state === "done" && !open}>
        {state === "done" ? t("report.already") : t("report.open")}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("report.title")}>
        {state === "done" ? (
          <>
            <p className="mb-4">{t("report.done")}</p>
            <button className="btn btn-line" onClick={() => setOpen(false)}>{t("common.close")}</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="mb-3 text-muted">{t("report.lead")}</p>
            <fieldset className="mb-3 grid gap-1.5">
              <legend className="sr-only">{t("report.title")}</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--hope)]" />
                  {t(`report.reasons.${r}`)}
                </label>
              ))}
            </fieldset>
            <label className="label" htmlFor={`rd-${id}`}>{t("report.details")}</label>
            <textarea id={`rd-${id}`} className="field mb-3" rows={2} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
            {error && <p className="mb-3 text-danger">{error}</p>}
            <div className="flex gap-2">
              <button className="btn btn-hope" disabled={!reason || state === "sending"}>{t("report.send")}</button>
              <button type="button" className="btn btn-line" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
