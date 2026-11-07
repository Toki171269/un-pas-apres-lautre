import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { api, POST_COLS, REPLY_COLS, supabase } from "../lib/api.js";
import { CRISIS_RE, HOPE_FIELDS } from "../lib/data.js";
import { currentPseudo, timeAgo } from "../lib/util.js";
import { Reactions, ReportButton } from "../components/community.jsx";
import { CrisisPanel, Notice, errText } from "../components/ui.jsx";

export default function PostPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [state, setState] = useState("loading");
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    (async () => {
      setState("loading");
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("posts").select(POST_COLS).eq("id", id).maybeSingle(),
        supabase.from("replies").select(REPLY_COLS).eq("post_id", id).order("created_at"),
      ]);
      setPost(p); setReplies(r || []); setState(p ? "ready" : "missing");
    })();
  }, [id]);

  if (state === "loading") return <div className="wrap py-10 text-muted">{t("common.loading")}</div>;
  if (state === "missing") return <div className="wrap py-10"><Notice>{t("errors.not_found")}</Notice><Link to="/communaute" className="mt-4 inline-block">{t("post.back")}</Link></div>;

  const top = replies.filter((r) => !r.parent_id);
  const children = (rid) => replies.filter((r) => r.parent_id === rid);
  const added = (r) => setReplies((list) => [...list, r]);

  return (
    <div className="wrap max-w-3xl py-10">
      <Link to="/communaute" className="mb-6 inline-block font-head font-bold">← {t("post.back")}</Link>
      <article className="card mb-6 p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span><strong className="font-head text-ink">{post.pseudo}</strong> · {timeAgo(post.created_at, t, lang)}
            {post.updated_at && new Date(post.updated_at) - new Date(post.created_at) > 60000 ? ` · ${t("post.edited")}` : ""}</span>
          <span className="font-head text-xs font-bold uppercase tracking-wide text-hope-text">
            {post.kind === "hope" ? t("space.espoir.name") : t(`cat.${post.category}`)}
          </span>
        </div>
        <h1 className="mb-4 text-2xl sm:text-3xl">{post.title}</h1>
        {post.kind === "hope" && post.hope ? (
          <div className="grid gap-4">
            {HOPE_FIELDS.filter((f) => post.hope[f]).map((f) => (
              <section key={f}>
                <h2 className="eyebrow">{t(`post.hope.${f}`)}</h2>
                <p className="whitespace-pre-line" style={{ overflowWrap: "anywhere" }}>{post.hope[f]}</p>
              </section>
            ))}
            <p className="text-sm italic text-muted">{t("post.hopeNote")}</p>
          </div>
        ) : (
          <p className="whitespace-pre-line text-[1.05rem]" style={{ overflowWrap: "anywhere" }}>{post.body}</p>
        )}
        <div className="mt-6 border-t border-line pt-4">
          <h2 className="mb-2 font-head text-sm font-bold">{t("post.supportTitle")}</h2>
          <Reactions post={post} />
          <div className="mt-3 text-right"><ReportButton type="post" id={post.id} /></div>
        </div>
      </article>

      <section aria-labelledby="replies-title">
        <h2 id="replies-title" className="mb-4 text-xl">{t("post.repliesTitle")} ({replies.length})</h2>
        {!replies.length && <p className="mb-4 text-muted">{t("post.noReplies")}</p>}
        <ol className="mb-6 grid gap-3">
          {top.map((r) => (
            <li key={r.id} className="list-none">
              <Reply r={r} onReply={post.allow_replies ? () => setReplyTo(r) : null} />
              {children(r.id).length > 0 && (
                <ol className="ml-5 mt-2 grid gap-2 border-l-2 border-line pl-4">
                  {children(r.id).map((c) => <li key={c.id} className="list-none"><Reply r={c} onReply={post.allow_replies ? () => setReplyTo(r) : null} /></li>)}
                </ol>
              )}
            </li>
          ))}
        </ol>
        {post.allow_replies
          ? <ReplyForm post={post} replyTo={replyTo} clearReplyTo={() => setReplyTo(null)} onAdded={added} />
          : <Notice>{t("post.closed")}</Notice>}
      </section>
    </div>
  );
}

function Reply({ r, onReply }) {
  const { t, lang } = useI18n();
  return (
    <div className="rounded-ui border border-line bg-surface px-4 py-3">
      <div className="mb-1 text-sm text-muted"><strong className="font-head text-ink">{r.pseudo}</strong> · {timeAgo(r.created_at, t, lang)}</div>
      <p className="whitespace-pre-line" style={{ overflowWrap: "anywhere" }}>{r.body}</p>
      <div className="mt-2 flex gap-4">
        {onReply && <button className="font-head text-sm font-bold text-hope-text" onClick={onReply}>{t("post.reply")}</button>}
        <ReportButton type="reply" id={r.id} className="ml-auto" />
      </div>
    </div>
  );
}

function ReplyForm({ post, replyTo, clearReplyTo, onAdded }) {
  const { t, lang } = useI18n();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [crisis, setCrisis] = useState(false);
  const pseudo = currentPseudo(lang);

  const submit = async (e) => {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setBusy(true); setMsg(null);
    if (CRISIS_RE.test(body)) setCrisis(true);
    try {
      const res = await api("reply", { post_id: post.id, parent_id: replyTo?.id, body, pseudo });
      if (res.crisis) setCrisis(true);
      if (res.reply) onAdded(res.reply);
      setMsg({ kind: res.status === "rejected" ? "error" : "ok", text: t(`moderation.${res.status}`) });
      if (res.status !== "rejected") { setBody(""); clearReplyTo(); }
    } catch (err) { setMsg({ kind: "error", text: errText(t, err) }); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="card grid gap-2" id="reply">
      <label htmlFor="reply-body" className="label">{replyTo ? t("post.replyTo", { p: replyTo.pseudo }) : t("post.replyLabel")}</label>
      {replyTo && <button type="button" className="justify-self-start text-sm text-muted underline" onClick={clearReplyTo}>{t("common.cancel")}</button>}
      <textarea id="reply-body" className="field" rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("post.replyPh")} />
      <p className="text-sm text-muted">{t("post.replyHint", { p: pseudo })}</p>
      <div><button className="btn btn-hope" disabled={busy || body.trim().length < 2}>{t("common.send")}</button></div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {crisis && <CrisisPanel compact />}
    </form>
  );
}
