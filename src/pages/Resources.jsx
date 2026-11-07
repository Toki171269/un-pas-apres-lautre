import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { track } from "../lib/api.js";
import { HELP_UPDATED, IMG, LETTER_TYPES, telHref } from "../lib/data.js";
import { downloadText, store } from "../lib/util.js";
import ChatBox from "../components/ChatBox.jsx";
import { CountrySelect, CrisisPanel, Icon, LineLink, Notice, PageHead } from "../components/ui.jsx";

const TOOLS = [["breath", "/ressources/respirer", "wind"], ["ground", "/ressources/ancrage", "anchor"], ["letter", "/ressources/lettre", "pen"],
  ["consult", "/ressources/consultation", "list"], ["directory", "/ressources/annuaire", "phone"]];
const GUIDE_ORDER = ["deuil", "rupture", "solitude", "confiance", "echec", "emotions", "relations", "violences", "demander", "habitudes", "accompagner"];

export default function Resources() {
  const { t } = useI18n();
  return (
    <div className="wrap py-10">
      <PageHead title={t("res.title")} lead={t("res.lead")} />
      <h2 className="mb-4 text-xl">{t("res.toolsTitle")}</h2>
      <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TOOLS.map(([k, to, icon]) => (
          <Link key={k} to={to} className="card flex flex-col gap-1 text-muted no-underline hover:border-muted">
            <span className="text-hope-text"><Icon name={icon} className="mb-2 h-6 w-6" /></span>
            <strong className="font-head text-ink">{t(`res.tools.${k}.t`)}</strong>
            <span className="text-sm">{t(`res.tools.${k}.d`)}</span>
          </Link>
        ))}
      </div>
      <h2 className="mb-1 text-xl">{t("res.guidesTitle")}</h2>
      <p className="mb-4 text-sm text-muted">{t("res.reviewed")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDE_ORDER.map((g) => (
          <Link key={g} to={`/ressources/guide/${g}`} className="card text-ink no-underline hover:border-muted">
            <strong className="mb-1 block font-head text-lg">{t(`res.guides.${g}.t`)}</strong>
            <span className="text-sm text-muted">{t(`res.guides.${g}.intro`)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Guide() {
  const { id } = useParams();
  const { t } = useI18n();
  const g = t(`res.guides.${id}`);
  useEffect(() => { if (typeof g === "object") track(`resource:${id}`); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (typeof g !== "object") return <div className="wrap py-10"><Notice>{t("notFound")}</Notice></div>;
  return (
    <div className="wrap max-w-3xl py-10">
      <Link to="/ressources" className="mb-6 inline-block font-head font-bold">← {t("nav.resources")}</Link>
      <PageHead title={g.t} lead={g.intro} />
      <div className="grid gap-6">
        <section><h2 className="eyebrow">{t("res.guideNormal")}</h2><p>{g.normal}</p></section>
        <section>
          <h2 className="eyebrow">{t("res.guideSteps")}</h2>
          <ol className="grid gap-2">{g.steps.map((s, i) => <li key={i} className="card flex gap-3 py-3"><span className="font-head font-extrabold text-hope-text">{i + 1}</span>{s}</li>)}</ol>
        </section>
        <section className="card border-l-4 border-l-hope"><h2 className="eyebrow">{t("res.guideHelp")}</h2><p>{g.help}</p></section>
        <p className="text-sm text-muted">{t("res.reviewed")}</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/ia" className="btn btn-hope">{t("nav.chat")}</Link>
          <Link to="/communaute" className="btn btn-line">{t("nav.community")}</Link>
          <Link to="/ressources/annuaire" className="btn btn-line">{t("res.tools.directory.t")}</Link>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Respiration
const MODES = { coherence: [["in", 5, 1], ["out", 5, 0.6]], box: [["in", 4, 1], ["hold", 4, 1], ["out", 4, 0.6], ["hold", 4, 0.6]] };
export function Breath() {
  const { t } = useI18n();
  const [mode, setMode] = useState("coherence");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!running) return;
    track("exercise:respiration");
    let i = 0;
    const start = Date.now();
    const step = () => {
      const p = MODES[mode][i % MODES[mode].length];
      setPhase(p); i++;
      timer.current = setTimeout(step, p[1] * 1000);
    };
    step();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => { clearTimeout(timer.current); clearInterval(tick); setPhase(null); setElapsed(0); };
  }, [running, mode]);

  const scale = phase ? phase[2] : 0.6;
  return (
    <div className="wrap py-10">
      <div className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div className="photo hidden aspect-[4/5] rounded-t-full rounded-b-ui bg-cover bg-center md:block" style={{ backgroundImage: `url(${IMG.breath})` }} />
        <div>
          <PageHead title={t("breath.title")} lead={t("breath.lead")} />
          <div className="flex flex-wrap items-center gap-8">
            <div className="grid h-48 w-48 shrink-0 place-items-center rounded-full bg-hope text-hope-ink transition-transform ease-in-out"
              style={{ transform: `scale(${scale})`, transitionDuration: `${phase ? phase[1] : 1.2}s` }} aria-live="polite">
              <span className="font-head text-xl font-extrabold" style={{ transform: `scale(${1 / scale})` }}>{phase ? t(`breath.${phase[0]}`) : t("breath.ready")}</span>
            </div>
            <div className="grid justify-items-start gap-3">
              <div className="flex overflow-hidden rounded-ui border border-line" role="radiogroup">
                {["coherence", "box"].map((m) => (
                  <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                    className={`px-3 py-2 font-head text-sm font-bold ${mode === m ? "bg-night text-white" : "text-muted"}`}>{t(m === "box" ? "breath.box" : "breath.coh")}</button>
                ))}
              </div>
              <button className="btn btn-hope" onClick={() => setRunning(!running)}>{running ? t("breath.stop") : t("breath.start")}</button>
              <p className="text-sm text-muted">
                {running ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}${elapsed >= 180 ? ` · ${t("breath.bravo")}` : ""}` : t("breath.hint")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Ancrage 5-4-3-2-1
export function Ground() {
  const { t } = useI18n();
  const steps = t("ground.steps");
  const [i, setI] = useState(0);
  useEffect(() => { track("exercise:ancrage"); }, []);
  const done = i >= steps.length;
  return (
    <div className="wrap max-w-2xl py-10">
      <PageHead title={t("ground.title")} lead={t("ground.lead")} />
      <div className="card p-8 text-center" aria-live="polite">
        {done ? (
          <p className="font-head text-xl font-bold">{t("ground.done")}</p>
        ) : (
          <>
            <span className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-hope font-head text-4xl font-extrabold text-hope-ink">{steps[i].n}</span>
            <p className="font-head text-xl font-bold">{steps[i].t}</p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-2">
          {done ? <button className="btn btn-line" onClick={() => setI(0)}>{t("ground.restart")}</button>
            : <button className="btn btn-hope" onClick={() => setI(i + 1)}>{t("ground.next")}</button>}
        </div>
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
          {steps.map((_, k) => <span key={k} className={`h-1.5 w-8 rounded-full ${k < i ? "bg-hope" : "bg-line"}`} />)}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Lettre jamais envoyée (avec l'IA)
export function Letter() {
  const { t } = useI18n();
  const [type, setType] = useState(() => store.get("upa-letter-type", "deceased"));
  const [text, setText] = useState(() => store.get("upa-letter", ""));
  const [keep, setKeep] = useState(() => !!store.get("upa-letter"));
  const [released, setReleased] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    store.set("upa-letter-type", type);
    if (keep) store.set("upa-letter", text); else store.del("upa-letter");
  }, [text, keep, type]);

  const release = () => {
    if (!text.trim()) return;
    setText(""); setReleased(true); store.del("upa-letter");
  };

  return (
    <div className="wrap py-10">
      <PageHead title={t("letter.title")} lead={t("letter.lead")} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <div>
            <label className="label" htmlFor="lt">{t("letter.type")}</label>
            <select id="lt" className="field" value={type} onChange={(e) => setType(e.target.value)}>
              {LETTER_TYPES.map((l) => <option key={l} value={l}>{t(`letter.types.${l}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ltext">{t("letter.editor")}</label>
            <textarea id="ltext" className="field font-head text-[1.05rem] leading-8" rows={14} value={text}
              onChange={(e) => { setText(e.target.value); setReleased(false); }} placeholder={t("letter.editorPh")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="h-4 w-4 accent-[var(--hope)]" />{t("letter.keep")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-hope" onClick={release} disabled={!text.trim()}>{t("letter.release")}</button>
            <button className="btn btn-line" onClick={() => downloadText("lettre.txt", text)} disabled={!text.trim()}>{t("letter.download")}</button>
          </div>
          {released && <Notice kind="ok">{t("letter.released")}</Notice>}
        </div>
        <div>
          {!ai ? (
            <div className="card border-t-4 border-t-hope">
              <h2 className="mb-2 text-lg">{t("letter.aiTitle")}</h2>
              <p className="mb-4 text-muted">{t("letter.aiLead")}</p>
              <button className="btn btn-hope" onClick={() => setAi(true)}>{t("letter.aiStart")}</button>
            </div>
          ) : (
            <ChatBox mode="letter" letterType={type} storageKey="upa-letter-chat" suggestions={false}
              firstMessage={t("letter.aiLead")}
              onInsert={(s) => setText((cur) => (cur ? `${cur}\n\n${s}` : s))} />
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Préparer une consultation
const CONSULT_FIELDS = ["feel", "since", "difficulties", "questions", "unsaid"];
export function Consult() {
  const { t } = useI18n();
  const [keep, setKeep] = useState(() => !!store.get("upa-consult"));
  const [values, setValues] = useState(() => store.get("upa-consult", Object.fromEntries(CONSULT_FIELDS.map((f) => [f, ""]))));
  useEffect(() => { if (keep) store.set("upa-consult", values); else store.del("upa-consult"); }, [values, keep]);
  useEffect(() => { track("exercise:consultation"); }, []);
  const summary = () => `${t("consult.fileTitle")}\n${new Date().toLocaleDateString()}\n\n` +
    CONSULT_FIELDS.map((f) => `${t(`consult.fields.${f}`)}\n${values[f] || "—"}`).join("\n\n");
  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("consult.title")} lead={t("consult.lead")} />
      <div className="card grid gap-4 p-6">
        {CONSULT_FIELDS.map((f) => (
          <div key={f}>
            <label htmlFor={`c-${f}`} className="label">{t(`consult.fields.${f}`)}</label>
            <textarea id={`c-${f}`} className="field" rows={f === "since" ? 1 : 3} value={values[f]} onChange={(e) => setValues({ ...values, [f]: e.target.value })} />
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="h-4 w-4 accent-[var(--hope)]" />{t("consult.keep")}
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-hope" onClick={() => downloadText("preparation-consultation.txt", summary())}>{t("consult.download")}</button>
          <button className="btn btn-line" onClick={() => setValues(Object.fromEntries(CONSULT_FIELDS.map((f) => [f, ""])))}>{t("consult.clear")}</button>
        </div>
        <p className="text-sm text-muted">{t("consult.tip")}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Annuaire
export function Directory() {
  const { t, lang } = useI18n();
  const { country } = useAppState();
  useEffect(() => { track("page:annuaire"); }, []);
  return (
    <div className="wrap max-w-4xl py-10">
      <PageHead title={t("directory.title")} lead={t("directory.lead")} />
      <CountrySelect className="mb-6" />
      <div className="card mb-4 border-t-4 border-t-hope">
        <h2 className="mb-1 text-xl">{country.name[lang]}</h2>
        <p className="mb-4">{t("directory.emergency")} : <a href={telHref(country.emergency.split(" ")[0])} className="font-head text-lg font-extrabold">{country.emergency}</a></p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {country.lines.map((l) => <li key={l.num}>{l.crisis && <span className="eyebrow mb-0 block">{t("directory.crisisLine")}</span>}<LineLink line={l} /></li>)}
        </ul>
      </div>
      <p className="mb-2 text-sm text-muted">{t("directory.updated", { d: HELP_UPDATED })}</p>
      <p className="text-sm text-muted">{t("directory.other")} <a href="https://findahelpline.com/" target="_blank" rel="noopener">findahelpline.com</a></p>
    </div>
  );
}

// ------------------------------------------------------------------ J'ai besoin d'aide maintenant
export function HelpNow() {
  const { t } = useI18n();
  const { country } = useAppState();
  useEffect(() => { track("page:aide-maintenant"); }, []);
  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("helpPage.title")} lead={t("helpPage.lead")} />
      <div className="mb-6 rounded-ui bg-night p-6 text-white">
        <p className="mb-2">{t("helpPage.danger")}</p>
        <a href={telHref(country.emergency.split(" ")[0])} className="font-head text-3xl font-extrabold text-hope no-underline">{t("helpPage.call", { n: country.emergency })}</a>
      </div>
      <h2 className="mb-3 text-xl">{t("helpPage.talk")}</h2>
      <div className="mb-8"><CrisisPanel /></div>
      <section className="card mb-6">
        <h2 className="mb-3 text-lg">{t("helpPage.stepsTitle")}</h2>
        <ol className="grid gap-2">{t("helpPage.steps").map((s, i) => <li key={i} className="flex gap-3"><span className="font-head font-extrabold text-hope-text">{i + 1}</span>{s}</li>)}</ol>
        <Link to="/ressources/respirer" className="mt-4 inline-block font-head font-bold">{t("res.tools.breath.t")}</Link>
      </section>
      <section className="card">
        <h2 className="mb-2 text-lg">{t("helpPage.alsoTitle")}</h2>
        <p className="mb-4 text-muted">{t("helpPage.also")}</p>
        <Link to="/ia" className="btn btn-hope">{t("nav.chat")}</Link>
      </section>
    </div>
  );
}
