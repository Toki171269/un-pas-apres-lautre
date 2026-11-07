import { createContext, useContext, useEffect, useMemo, useState } from "react";
import fr from "../i18n/fr.js";
import en from "../i18n/en.js";
import es from "../i18n/es.js";
import { store } from "./util.js";

const DICTS = { fr, en, es };
export const LANGS = ["fr", "en", "es"];
const Ctx = createContext(null);

function initialLang() {
  const saved = store.get("upa-lang");
  if (LANGS.includes(saved)) return saved;
  const nav = (navigator.language || "fr").slice(0, 2);
  return LANGS.includes(nav) ? nav : "fr";
}

// Lit une clé "a.b.c" ; repli sur le français si la traduction manque
function lookup(dict, key) {
  return key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => {
    const t = (key, vars) => {
      let s = lookup(DICTS[lang], key) ?? lookup(fr, key) ?? key;
      if (typeof s === "string" && vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    };
    const setLang = (l) => { if (LANGS.includes(l)) { store.set("upa-lang", l); setLangState(l); } };
    return { lang, setLang, t };
  }, [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
