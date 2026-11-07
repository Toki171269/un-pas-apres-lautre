import { createContext, useContext, useMemo, useState } from "react";
import { session, store } from "./util.js";
import { COUNTRIES, guessCountry } from "./data.js";
import { useI18n } from "./i18n.jsx";

// Situation choisie (facultative) et pays des ressources d'aide : gardés dans le navigateur uniquement
const Ctx = createContext(null);

export function AppStateProvider({ children }) {
  const { lang } = useI18n();
  const [situation, setSituationState] = useState(() => session.get("upa-situation"));
  const [countryId, setCountryState] = useState(() => store.get("upa-country"));
  const value = useMemo(() => {
    const id = countryId && COUNTRIES.some((c) => c.id === countryId) ? countryId : guessCountry(lang);
    return {
      situation,
      setSituation: (s) => { session.set("upa-situation", s); setSituationState(s); },
      country: COUNTRIES.find((c) => c.id === id),
      setCountry: (c) => { store.set("upa-country", c); setCountryState(c); },
    };
  }, [situation, countryId, lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAppState = () => useContext(Ctx);
