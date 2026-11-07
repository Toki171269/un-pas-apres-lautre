import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { COUNTRIES, telHref } from "../lib/data.js";

export function Logo({ light }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect x="3" y="20" width="8" height="9" fill={light ? "#9fb0c2" : "#5c6b7d"} />
      <rect x="12" y="13" width="8" height="16" fill={light ? "#9fb0c2" : "#5c6b7d"} />
      <rect x="21" y="5" width="8" height="24" fill="var(--hope)" />
    </svg>
  );
}

const PATHS = {
  chat: "M4 5h16v11H9l-5 4V5z",
  book: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zm16 0h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4",
  hand: "M7 11V6a1.5 1.5 0 0 1 3 0v4m0 0V4.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-3a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a6 6 0 0 1-5.2-3l-2.3-4a1.5 1.5 0 0 1 2.6-1.5L7 13",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5 5-2z",
  wind: "M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  leaf: "M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7",
  anchor: "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 0v14m-7-7a7 7 0 0 0 14 0M8 11h8",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  flame: "M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2.5 1.5-3.5 1.5-5 1 .8 1.5 1.6 1.5 2.5 1-1.6 1-3.6 1-6z",
  menu: "M4 7h16M4 12h16M4 17h16",
  x: "M6 6l12 12M18 6 6 18",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  copy: "M9 9h10v10H9zM5 15V5h10",
};
export function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function PageHead({ eyebrow, title, lead, children }) {
  return (
    <header className="mb-8 max-w-3xl">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="mb-3 text-3xl sm:text-4xl">{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </header>
  );
}

export function Notice({ kind = "info", children }) {
  const cls = kind === "error" ? "border-danger text-danger" : kind === "ok" ? "border-hope" : "border-line";
  return <div role="status" className={`rounded-ui border-l-4 bg-surface px-4 py-3 ${cls}`}>{children}</div>;
}

export function CountrySelect({ className = "" }) {
  const { t, lang } = useI18n();
  const { country, setCountry } = useAppState();
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="font-head font-bold">{t("crisis.country")}</span>
      <select className="field w-auto py-1.5" value={country.id} onChange={(e) => setCountry(e.target.value)}>
        {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
      </select>
    </label>
  );
}

export function LineLink({ line, className = "" }) {
  const { lang } = useI18n();
  const href = line.href || telHref(line.num);
  return (
    <a href={href} target={line.href ? "_blank" : undefined} rel={line.href ? "noopener" : undefined} className={`no-underline ${className}`}>
      <strong className="font-head text-lg text-hope-text">{line.num}</strong>
      <span className="block text-sm text-muted">{line.desc[lang]}</span>
    </a>
  );
}

// Panneau d'urgence : indépendant de l'IA, toujours basé sur des données vérifiables
export function CrisisPanel({ compact = false }) {
  const { t } = useI18n();
  const { country } = useAppState();
  const lines = compact ? country.lines.filter((l) => l.crisis) : country.lines;
  return (
    <section className="rounded-ui border border-line border-t-4 border-t-hope bg-surface p-5" aria-labelledby="crisis-title">
      <h2 id="crisis-title" className="mb-2 text-xl">{t("crisis.title")}</h2>
      <p className="mb-3">{t("crisis.text")}</p>
      <div className="mb-3"><CountrySelect /></div>
      <ul className="mb-3 grid gap-3 sm:grid-cols-2">
        {lines.map((l) => <li key={l.num}><LineLink line={l} /></li>)}
      </ul>
      <p className="mb-1 font-semibold">{t("crisis.emergency", { n: country.emergency })}</p>
      <p className="mb-3 text-muted">{t("crisis.trusted")}</p>
      <Link to="/aide-maintenant" className="font-head font-bold">{t("crisis.all")}</Link>
    </section>
  );
}

export function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-ui border border-line border-t-4 border-t-hope bg-surface p-6 text-ink backdrop:bg-black/60">
      <h2 className="mb-3 text-xl">{title}</h2>
      {children}
    </dialog>
  );
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignoré */ }
  };
  return [copied, copy];
}

export const errText = (t, err) => {
  const s = t(`errors.${err?.code || "server_error"}`);
  return s.startsWith("errors.") ? t("errors.server_error") : s;
};
