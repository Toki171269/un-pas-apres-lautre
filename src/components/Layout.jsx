import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n, LANGS } from "../lib/i18n.jsx";
import { useAppState } from "../lib/state.jsx";
import { store } from "../lib/util.js";
import { Icon, Logo } from "./ui.jsx";

const NAV = [
  ["/", "home"], ["/ia", "chat"], ["/communaute", "community"], ["/deposer", "publish"],
  ["/espoir", "hope"], ["/aider", "help"], ["/ressources", "resources"],
];

function quickExit() {
  try { sessionStorage.clear(); } catch { /* ignoré */ }
  window.location.replace("https://www.google.com/search?q=meteo");
}

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const { country } = useAppState();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { document.title = t("meta.title"); }, [t]);
  useEffect(() => {
    let times = [];
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      times = times.filter((x) => now - x < 1200).concat(now);
      if (times.length >= 3) quickExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("upa-theme", root.dataset.theme);
  };

  const navLink = ({ isActive }) =>
    `rounded-ui px-2.5 py-1.5 font-head text-[0.92rem] font-bold no-underline ${isActive ? "text-hope-text" : "text-ink hover:text-hope-text"}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Contenu</a>
      <div className="bg-night-deep px-4 py-1.5 text-center text-sm text-slate-300">
        {t("urgentBar", { n: country.emergency })}{" "}
        <Link to="/aide-maintenant" className="font-semibold text-hope no-underline">{t("urgentLink")}</Link>
      </div>

      <header className="border-b border-line bg-surface">
        <div className="wrap flex items-center gap-3 py-3">
          <Link to="/" className="flex items-center gap-2.5 text-ink no-underline">
            <Logo />
            <span className="font-head text-lg font-extrabold leading-tight">
              {t("brand")}
              <small className="block font-sans text-xs font-medium text-muted">{t("tagline")}</small>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/aide-maintenant" className="btn btn-hope btn-sm hidden sm:inline-flex">{t("helpNow")}</Link>
            <div className="hidden overflow-hidden rounded-ui border border-line sm:flex" role="group" aria-label="Langue / Language / Idioma">
              {LANGS.map((l) => (
                <button key={l} lang={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={`px-2 py-1.5 font-head text-xs font-bold uppercase ${lang === l ? "bg-night text-white" : "text-muted"}`}>{l}</button>
              ))}
            </div>
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-ui border border-line" aria-label={t("theme")} title={t("theme")}>
              <Icon name="moon" className="h-4 w-4" />
            </button>
            <button onClick={quickExit} title={t("exitTitle")} className="rounded-ui border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink">{t("exit")}</button>
            <button className="grid h-9 w-9 place-items-center rounded-ui border border-line lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mainnav" aria-label={t("menu")}>
              <Icon name={open ? "x" : "menu"} />
            </button>
          </div>
        </div>
        <nav id="mainnav" aria-label="Navigation" className={`wrap pb-3 ${open ? "block" : "hidden"} lg:block`}>
          <div className="flex flex-col gap-1 lg:flex-row lg:flex-wrap">
            {NAV.map(([to, key]) => <NavLink key={to} to={to} end={to === "/"} className={navLink}>{t(`nav.${key}`)}</NavLink>)}
          </div>
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <Link to="/aide-maintenant" className="btn btn-hope btn-sm">{t("helpNow")}</Link>
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`chip uppercase`}>{l}</button>
            ))}
          </div>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 bg-night-deep py-12 text-slate-300">
        <div className="wrap grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-3 flex items-center gap-2 font-head text-lg font-extrabold text-white no-underline"><Logo light />{t("brand")}</Link>
            <p className="text-sm">{t("footer.disclaimer")}</p>
            <p className="mt-2 text-sm">{t("crisis.emergency", { n: country.emergency })}</p>
          </div>
          <FooterCol title={t("footer.links")} links={NAV.slice(1).map(([to, key]) => [to, t(`nav.${key}`)])} />
          <FooterCol title={t("helpNow")} links={[["/aide-maintenant", t("helpNow")], ["/ressources/annuaire", t("res.tools.directory.t")], ["/ressources/respirer", t("res.tools.breath.t")]]} />
          <FooterCol title={t("footer.trust")} links={[["/charte", t("footer.charter")], ["/confidentialite", t("footer.privacy")], ["/gerer", t("footer.manage")], ["/admin", t("footer.admin")]]}>
            <p className="mt-2 text-xs text-slate-400">{t("footer.photos")}</p>
          </FooterCol>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links, children }) {
  return (
    <div>
      <h2 className="mb-3 text-base text-white">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map(([to, label]) => <li key={to}><Link to={to} className="text-slate-300 no-underline hover:text-white">{label}</Link></li>)}
      </ul>
      {children}
    </div>
  );
}
