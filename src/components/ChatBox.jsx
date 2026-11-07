import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { parseMarkers, streamChat } from "../lib/api.js";
import { CRISIS_RE } from "../lib/data.js";
import { session } from "../lib/util.js";
import { CrisisPanel, Icon, errText, useCopy } from "./ui.jsx";

const EXERCISE_LINK = { respiration: "/ressources/respirer", ancrage: "/ressources/ancrage", ecriture: "/ressources/lettre" };
const SPACE_LINK = (s) => (s === "espoir" ? "/espoir" : `/communaute/espace/${s}`);

// Conversation sans compte : gardée dans l'onglet (sessionStorage) le temps de la visite seulement
export default function ChatBox({ mode = "chat", letterType, storageKey = "upa-chat", firstMessage, onInsert, suggestions = true }) {
  const { t, lang } = useI18n();
  const { situation } = useAppState();
  const [messages, setMessages] = useState(() => session.get(storageKey, []));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [crisis, setCrisis] = useState(() => session.get(storageKey + "-crisis", false));
  const abortRef = useRef(null);
  const endRef = useRef(null);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [, copy] = useCopy();

  useEffect(() => { session.set(storageKey, messages); }, [messages, storageKey]);
  useEffect(() => { session.set(storageKey + "-crisis", crisis); }, [crisis, storageKey]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    if (CRISIS_RE.test(content)) setCrisis(true); // filet de sécurité indépendant de l'IA
    const history = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", pending: true }]);
    setInput(""); setError(""); setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const sit = situation ? t(`cat.${situation}`) : "";
      await streamChat(
        { messages: history.map(({ role, content: c }) => ({ role, content: c })), lang, mode, letterType, situation: sit },
        {
          signal: ctrl.signal,
          onMeta: (m) => { if (m.crisis) setCrisis(true); },
          onDelta: (d) => {
            acc += d;
            setMessages([...history, { role: "assistant", content: acc, pending: true }]);
          },
        },
      );
      if (parseMarkers(acc).markers.crisis) setCrisis(true);
      setMessages(acc ? [...history, { role: "assistant", content: acc }] : history);
    } catch (err) {
      setError(errText(t, err));
      setMessages(acc ? [...history, { role: "assistant", content: acc }] : history);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();
  const reset = () => { stop(); setMessages([]); setCrisis(false); setError(""); };

  return (
    <div className="grid gap-4">
      <div className="card min-h-[320px] p-0" aria-live="polite">
        <ol className="grid gap-4 p-4 sm:p-6">
          <Bubble role="assistant" text={firstMessage || t("chat.hello")} />
          {messages.map((m, i) => {
            const { clean, markers } = parseMarkers(m.content);
            return (
              <li key={i} className="list-none">
                <Bubble role={m.role} text={clean} pending={m.pending && !clean} />
                {m.role === "assistant" && !m.pending && clean && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-1 text-sm">
                    <button className="text-muted hover:text-ink" onClick={() => { copy(clean); setCopiedIdx(i); setTimeout(() => setCopiedIdx(-1), 1500); }}>
                      {copiedIdx === i ? t("chat.copied") : t("chat.copy")}
                    </button>
                    {onInsert && <button className="font-head font-bold text-hope-text" onClick={() => onInsert(clean)}>{t("letter.insert")}</button>}
                    {markers.spaces.map((s) => <Link key={s} to={SPACE_LINK(s)} className="font-head font-bold">{t("chat.seeSpace", { s: t(`space.${s}.name`) })}</Link>)}
                    {markers.exercises.map((x) => EXERCISE_LINK[x] && <Link key={x} to={EXERCISE_LINK[x]} className="font-head font-bold">{t(`chat.exercise.${x}`)}</Link>)}
                    {markers.resources && <Link to="/ressources/annuaire" className="font-head font-bold">{t("chat.resources")}</Link>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      {crisis && <CrisisPanel compact />}
      {error && <p className="text-danger" role="alert">{error}</p>}

      {suggestions && messages.length === 0 && (
        <div>
          <p className="mb-2 font-head text-sm font-bold">{t("chat.suggestionsTitle")}</p>
          <div className="flex flex-wrap gap-2">
            {t("chat.suggestions").map((s) => <button key={s} className="chip bg-surface" onClick={() => send(s)}>{s}</button>)}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="grid gap-2">
        <label htmlFor={`${storageKey}-input`} className="sr-only">{t("chat.placeholder")}</label>
        <textarea id={`${storageKey}-input`} className="field" rows={3} maxLength={4000} value={input}
          placeholder={t("chat.placeholder")} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="flex flex-wrap items-center gap-2">
          {busy
            ? <button type="button" className="btn btn-line" onClick={stop}>{t("chat.stop")}</button>
            : <button className="btn btn-hope" disabled={!input.trim()}>{t("chat.send")}</button>}
          {messages.length > 0 && !busy && (
            <>
              <button type="button" className="btn btn-line" onClick={reset}>{t("chat.restart")}</button>
              <button type="button" className="text-sm text-muted underline" onClick={reset}>{t("chat.clear")}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, text, pending }) {
  const { t } = useI18n();
  const me = role === "user";
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-ui px-4 py-3 ${me ? "bg-night text-white" : "border-l-2 border-hope bg-surface-2"}`}>
        <span className="sr-only">{me ? t("chat.you") : t("chat.ai")} : </span>
        {pending
          ? <span className="typing font-head text-xl" aria-label="…"><span>.</span><span>.</span><span>.</span></span>
          : <p className="whitespace-pre-line" style={{ overflowWrap: "anywhere" }}>{text}</p>}
      </div>
    </div>
  );
}

export function ChatIntro() {
  const { t } = useI18n();
  return (
    <div className="grid gap-2 text-sm text-muted">
      <p className="flex gap-2"><Icon name="flame" className="h-4 w-4 shrink-0 text-hope-text" />{t("chat.disclaimer")}</p>
      <p>{t("chat.privacy")} <Link to="/confidentialite">{t("footer.privacy")}</Link></p>
    </div>
  );
}
