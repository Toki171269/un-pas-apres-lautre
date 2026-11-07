import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { api, supabase } from "../lib/api.js";
import { remembered } from "../lib/util.js";
import { ReportButton } from "../components/community.jsx";
import { Notice, PageHead, errText } from "../components/ui.jsx";
import { PostList, usePosts } from "./Community.jsx";

export default function HelpOthers() {
  const { t } = useI18n();
  // Les histoires qui attendent depuis le plus longtemps d'abord
  const feed = usePosts({ mode: "unanswered", ascending: true });
  const { hash } = useLocation();
  useEffect(() => { if (hash === "#encouragements") setTimeout(() => document.getElementById("encouragements")?.scrollIntoView(), 50); }, [hash]);
  return (
    <div className="wrap py-10">
      <PageHead title={t("helpOthers.title")} lead={t("helpOthers.lead")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 text-xl">{t("helpOthers.unanswered")}</h2>
          <PostList {...feed} empty={t("helpOthers.allRead")} />
        </section>
        <aside className="card self-start border-t-4 border-t-hope">
          <h2 className="mb-3 text-lg">{t("helpOthers.howTitle")}</h2>
          <ul className="grid gap-2 text-sm">
            {t("helpOthers.how").map((h) => <li key={h} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-hope" />{h}</li>)}
          </ul>
        </aside>
      </div>
      <EncouragementWall />
    </div>
  );
}

const thanked = remembered("upa-thanks");

export function EncouragementWall() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [, force] = useState(0);

  useEffect(() => {
    supabase.from("encouragements").select("id, created_at, body, category, lang, thanks").eq("lang", lang)
      .order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => { const list = (data || []).sort(() => Math.random() - 0.5); setItems(list); setIdx(0); });
  }, [lang]);

  const seed = t("enc.seed").map((b, i) => ({ id: `seed-${i}`, body: b, thanks: 0, seed: true }));
  const all = items.length ? items : seed;
  const featured = all[idx % all.length];

  const thank = async (it) => {
    if (it.seed || thanked.has(it.id)) return;
    thanked.add(it.id);
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, thanks: x.thanks + 1 } : x)));
    force((x) => x + 1);
    try { await api("thanks", { id: it.id }); } catch { /* compteur local */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await api("encouragement", { body, lang });
      if (res.item) setItems((l) => [res.item, ...l]);
      setMsg({ kind: res.status === "rejected" ? "error" : "ok", text: t(`moderation.${res.status}`) });
      if (res.status !== "rejected") setBody("");
    } catch (err) { setMsg({ kind: "error", text: errText(t, err) }); }
    setBusy(false);
  };

  return (
    <section id="encouragements" className="mt-14 scroll-mt-6">
      <h2 className="h2">{t("enc.title")}</h2>
      <p className="lead mb-6">{t("enc.lead")}</p>

      <div className="mb-6 rounded-ui bg-night p-8 text-white">
        <blockquote className="mb-5 font-head text-2xl font-bold">{featured.body}</blockquote>
        <div className="flex flex-wrap items-center gap-3">
          {!featured.seed && (
            <button className="btn btn-hope btn-sm" onClick={() => thank(featured)} aria-pressed={thanked.has(featured.id)}>
              {thanked.has(featured.id) ? t("enc.thanked") : t("enc.needed")}{featured.thanks ? ` · ${featured.thanks}` : ""}
            </button>
          )}
          {all.length > 1 && <button className="btn btn-sm border-white/30 text-white" onClick={() => setIdx((i) => i + 1)}>{t("enc.another")}</button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {all.slice(0, 12).map((it) => (
            <li key={it.id} className="card flex flex-col gap-3">
              <p className="font-head font-bold" style={{ overflowWrap: "anywhere" }}>{it.body}</p>
              {!it.seed && (
                <div className="mt-auto flex items-center gap-3">
                  <button className={`text-sm font-semibold ${thanked.has(it.id) ? "text-hope-text" : "text-muted hover:text-ink"}`} onClick={() => thank(it)}>
                    {thanked.has(it.id) ? t("enc.thanked") : t("enc.needed")}{it.thanks ? ` · ${it.thanks}` : ""}
                  </button>
                  <ReportButton type="encouragement" id={it.id} className="ml-auto" />
                </div>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="card grid gap-2 self-start">
          <h3 className="text-lg">{t("enc.writeTitle")}</h3>
          <label htmlFor="enc" className="sr-only">{t("enc.writeTitle")}</label>
          <textarea id="enc" className="field" rows={3} maxLength={300} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("enc.writePh")} />
          <p className="text-xs text-muted">{t("enc.writeHint")}</p>
          <div><button className="btn btn-hope" disabled={busy || body.trim().length < 5}>{t("enc.submit")}</button></div>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        </form>
      </div>
    </section>
  );
}
