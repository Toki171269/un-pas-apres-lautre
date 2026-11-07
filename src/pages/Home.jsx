import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { supabase } from "../lib/api.js";
import { CATEGORIES, IMG, SPACES, SPACE_OF } from "../lib/data.js";
import { Icon } from "../components/ui.jsx";

const DAY = { talk: "/ia", calm: "/ressources/respirer", express: "/ressources/lettre", read: "/espoir", lonely: "/communaute", urgent: "/aide-maintenant" };

export default function Home() {
  const { t, lang } = useI18n();
  const { situation, setSituation } = useAppState();
  const navigate = useNavigate();
  const [enc, setEnc] = useState([]);

  useEffect(() => {
    supabase.from("encouragements").select("id, body, lang").eq("lang", lang).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setEnc((data || []).sort(() => Math.random() - 0.5).slice(0, 3)));
  }, [lang]);
  const comforts = enc.length >= 3 ? enc.map((e) => e.body) : t("enc.seed").slice(0, 3);

  const choose = (c) => {
    setSituation(c);
    if (c === "inconnu") navigate("/ia");
  };
  const space = situation ? SPACE_OF[situation] : null;

  return (
    <>
      <section className="relative isolate overflow-hidden text-white">
        <div className="photo absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${IMG.hero})` }} role="img" aria-label="" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#232c37f0] via-[#232c37c0] to-[#232c3755]" />
        <div className="wrap py-20 sm:py-28">
          <p className="mb-3 font-head font-bold text-hope">{t("home.eyebrow")}</p>
          <h1 className="mb-5 max-w-3xl text-4xl text-white sm:text-6xl">{t("home.title")}<br /><span className="text-hope">{t("home.titleHl")}</span></h1>
          <p className="mb-6 max-w-2xl text-lg text-slate-200">{t("home.welcome")}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/ia" className="btn btn-hope">{t("home.ctaChat")}</Link>
            <Link to="/communaute" className="btn border-white/40 text-white hover:border-white">{t("home.ctaRead")}</Link>
          </div>
          <p className="mt-6 text-sm text-slate-300">{t("home.noAccount")}</p>
        </div>
      </section>

      {/* Accès principaux */}
      <section className="wrap -mt-px">
        <div className="grid border border-t-0 border-line bg-surface sm:grid-cols-2 lg:grid-cols-5">
          {[["/ia", "chat", "chat"], ["/communaute", "community", "book"], ["/deposer", "publish", "pen"], ["/aider", "help", "hand"], ["/ressources", "resources", "compass"]].map(([to, key, icon], i) => (
            <Link key={key} to={to} className={`flex flex-col gap-1 p-5 text-muted no-underline hover:bg-surface-2 ${i ? "border-t border-line sm:border-t-0 lg:border-l" : ""}`}>
              <span className="text-hope-text"><Icon name={icon} className="mb-2 h-6 w-6" /></span>
              <strong className="font-head text-ink">{t(`home.access.${key}.t`)}</strong>
              <span className="text-sm">{t(`home.access.${key}.d`)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="wrap py-14">
        <h2 className="h2">{t("home.missionTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {t("home.mission").map((m) => (
            <div key={m.t} className="card border-l-4 border-l-hope"><h3 className="mb-1 text-lg">{m.t}</h3><p className="text-muted">{m.d}</p></div>
          ))}
        </div>
      </section>

      {/* Situation */}
      <section className="bg-bg-soft py-14">
        <div className="wrap">
          <h2 className="h2">{t("home.situationTitle")}</h2>
          <p className="lead mb-5">{t("home.situationLead")}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => choose(c)} aria-pressed={situation === c} className="chip bg-surface">{t(`cat.${c}`)}</button>
            ))}
          </div>
          {situation && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span>{t("home.situationChosen", { s: t(`cat.${situation}`) })}</span>
              <Link to={`/communaute?cat=${situation}`} className="font-head font-bold">{t("nav.community")}</Link>
              {space && <Link to={`/communaute/espace/${space}`} className="font-head font-bold">{t(`space.${space}.name`)}</Link>}
              <Link to="/ressources" className="font-head font-bold">{t("nav.resources")}</Link>
              <Link to="/ia" className="font-head font-bold">{t("home.unknownCta")}</Link>
              <button className="text-muted underline" onClick={() => setSituation(null)}>{t("home.situationClear")}</button>
            </div>
          )}
        </div>
      </section>

      {/* Aide-moi à traverser cette journée */}
      <section className="wrap py-14">
        <h2 className="h2">{t("home.dayTitle")}</h2>
        <p className="lead mb-5">{t("home.dayLead")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(DAY).map(([k, to]) => (
            <Link key={k} to={to} className={`card flex items-center justify-between gap-3 font-head font-bold no-underline hover:border-muted ${k === "urgent" ? "border-hope text-hope-text" : "text-ink"}`}>
              {t(`home.day.${k}`)} <Icon name="arrow" className="h-5 w-5 shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Mots réconfortants */}
      <section className="wrap">
        <div className="rounded-ui bg-night p-8 text-white sm:p-10">
          <h2 className="mb-6 text-2xl text-white">{t("home.comfortTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {comforts.map((c, i) => <blockquote key={i} className="border-l-2 border-hope pl-4 font-head text-lg font-bold">{c}</blockquote>)}
          </div>
          <Link to="/aider#encouragements" className="mt-6 inline-block font-head font-bold text-hope no-underline">{t("enc.title")}</Link>
        </div>
      </section>

      {/* Espaces */}
      <section className="wrap py-14">
        <h2 className="h2">{t("home.spacesTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPACES.map((s) => (
            <Link key={s} to={s === "espoir" ? "/espoir" : `/communaute/espace/${s}`} className="card overflow-hidden p-0 text-ink no-underline hover:border-muted">
              <div className="photo h-32 bg-cover bg-center" style={{ backgroundImage: `url(${IMG[s]})` }} />
              <div className="p-5"><h3 className="mb-1 text-lg">{t(`space.${s}.name`)}</h3><p className="text-sm text-muted">{t(`space.${s}.desc`)}</p></div>
            </Link>
          ))}
        </div>
        <p className="mt-12 text-center font-head text-xl font-bold text-hope-text">{t("home.devise")}</p>
      </section>
    </>
  );
}
