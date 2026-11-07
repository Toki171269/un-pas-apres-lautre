import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { api } from "../lib/api.js";
import { CRISIS_RE, HOPE_FIELDS, SPACES } from "../lib/data.js";
import { currentPseudo, downloadText, newPseudo, session } from "../lib/util.js";
import { CategorySelect } from "../components/community.jsx";
import { CrisisPanel, Notice, PageHead, errText, useCopy } from "../components/ui.jsx";

export default function Publish() {
  const { t, lang } = useI18n();
  const { situation } = useAppState();
  const [params] = useSearchParams();
  const [kind, setKind] = useState(params.get("type") === "hope" ? "hope" : "story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hope, setHope] = useState(() => Object.fromEntries(HOPE_FIELDS.map((f) => [f, ""])));
  const [category, setCategory] = useState(situation || "autre");
  const [space, setSpace] = useState(SPACES.includes(params.get("espace")) ? params.get("espace") : "");
  const [pseudo, setPseudo] = useState(() => currentPseudo(lang));
  const [allowReplies, setAllowReplies] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, copy] = useCopy();

  const otherPseudo = () => { const p = newPseudo(lang); session.set("upa-pseudo", p); setPseudo(p); };
  const text = kind === "hope" ? Object.values(hope).join("\n") : body;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await api("post", {
        kind, title, body, hope: kind === "hope" ? hope : undefined, consent, category, space: space || undefined,
        pseudo, allow_replies: allowReplies, lang,
      });
      setResult({ ...res, crisis: res.crisis || CRISIS_RE.test(text), title });
    } catch (err) { setError(errText(t, err)); }
    setBusy(false);
  };

  if (result) {
    const manageUrl = `${location.origin}${location.pathname}#/gerer`;
    return (
      <div className="wrap max-w-2xl py-10">
        <PageHead title={t("publish.title")} />
        <div className="grid gap-5">
          <Notice kind={result.status === "rejected" ? "error" : "ok"}>{t(`moderation.${result.status}`)}</Notice>
          {result.crisis && <CrisisPanel compact />}
          {result.code && (
            <section className="card border-t-4 border-t-hope">
              <h2 className="mb-2 text-xl">{t("publish.codeTitle")}</h2>
              <p className="mb-4 text-muted">{t("publish.codeText")}</p>
              <p className="mb-4 select-all rounded-ui bg-surface-2 p-4 text-center font-mono text-xl tracking-wider">{result.code}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-hope" onClick={() => copy(result.code)}>{copied ? t("common.copied") : t("common.copy")}</button>
                <button className="btn btn-line" onClick={() => downloadText("code-un-pas-apres-lautre.txt", t("publish.codeFile", { code: result.code, title: result.title, url: manageUrl }))}>{t("publish.codeDownload")}</button>
              </div>
            </section>
          )}
          <div className="flex flex-wrap gap-3">
            {result.status === "visible" && <Link className="btn btn-hope" to={`/histoire/${result.id}`}>{t("publish.view")}</Link>}
            <button className="btn btn-line" onClick={() => { setResult(null); setTitle(""); setBody(""); }}>{t("publish.another")}</button>
            <Link className="btn btn-line" to="/gerer">{t("publish.manageLink")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("publish.title")} lead={t("publish.lead")} />
      <div className="mb-6 flex flex-wrap gap-2" role="group">
        {["story", "hope"].map((k) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{t(`publish.kind.${k}`)}</button>)}
      </div>

      <form onSubmit={submit} className="card grid gap-4 p-6">
        {kind === "hope" && <p className="text-muted">{t("publish.hopeIntro")}</p>}
        <div>
          <label htmlFor="pt" className="label">{t("publish.titleLabel")}</label>
          <input id="pt" className="field" maxLength={120} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("publish.titlePh")} />
        </div>

        {kind === "story" ? (
          <div>
            <label htmlFor="pb" className="label">{t("publish.bodyLabel")}</label>
            <textarea id="pb" className="field" rows={10} maxLength={6000} required value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("publish.bodyPh")} />
            <p className="mt-1 text-right text-xs text-muted">{body.length}/6000</p>
          </div>
        ) : HOPE_FIELDS.map((f) => (
          <div key={f}>
            <label htmlFor={`h-${f}`} className="label">{t(`publish.hopeFields.${f}`)} <span className="font-normal text-muted">({t("common.optional")})</span></label>
            <textarea id={`h-${f}`} className="field" rows={3} maxLength={1500} value={hope[f]} onChange={(e) => setHope({ ...hope, [f]: e.target.value })} />
          </div>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc" className="label">{t("publish.category")} <span className="font-normal text-muted">({t("common.optional")})</span></label>
            <CategorySelect id="pc" value={category} onChange={setCategory} />
          </div>
          {kind === "story" && (
            <div>
              <label htmlFor="ps" className="label">{t("publish.space")}</label>
              <select id="ps" className="field" value={space} onChange={(e) => setSpace(e.target.value)}>
                <option value="">{t("publish.spaceAuto")}</option>
                {SPACES.filter((s) => s !== "espoir").map((s) => <option key={s} value={s}>{t(`space.${s}.name`)}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <span className="label">{t("publish.pseudo")}</span>
          <div className="flex flex-wrap items-center gap-3">
            <strong className="font-head">{pseudo}</strong>
            <button type="button" className="btn btn-line btn-sm" onClick={otherPseudo}>{t("publish.pseudoNew")}</button>
          </div>
          <p className="mt-1 text-sm text-muted">{t("publish.pseudoHint")}</p>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowReplies} onChange={(e) => setAllowReplies(e.target.checked)} className="h-4 w-4 accent-[var(--hope)]" />
          {t("publish.allowReplies")}
        </label>
        {kind === "hope" && (
          <label className="flex items-start gap-2">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--hope)]" />
            {t("publish.consent")}
          </label>
        )}
        <p className="text-sm text-muted"><Link to="/charte">{t("publish.charter")}</Link></p>
        {error && <Notice kind="error">{error}</Notice>}
        <div><button className="btn btn-hope" disabled={busy}>{busy ? t("common.loading") : t("publish.submit")}</button></div>
      </form>
    </div>
  );
}
