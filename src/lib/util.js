// Stockage local tolérant (navigation privée, stockage bloqué…)
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignoré */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignoré */ } },
};
export const session = {
  get(k, d = null) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignoré */ } },
};

// Pseudonyme aléatoire, gardé temporairement dans ce navigateur (pas un profil)
const WORDS = {
  fr: { a: ["Colibri", "Lanterne", "Héron", "Galet", "Luciole", "Saule", "Comète", "Mésange", "Nuage", "Phare", "Renard", "Brise"],
        b: ["paisible", "discret", "patient", "lumineux", "tranquille", "fidèle", "rêveur", "doux", "courageux", "attentif"] },
  en: { a: ["Hummingbird", "Lantern", "Heron", "Pebble", "Firefly", "Willow", "Comet", "Robin", "Cloud", "Lighthouse", "Fox", "Breeze"],
        b: ["Quiet", "Gentle", "Patient", "Bright", "Calm", "Kind", "Dreamy", "Soft", "Brave", "Steady"] },
  es: { a: ["Colibrí", "Farol", "Garza", "Guijarro", "Luciérnaga", "Sauce", "Cometa", "Gorrión", "Nube", "Faro", "Zorro", "Brisa"],
        b: ["tranquilo", "discreto", "paciente", "luminoso", "sereno", "fiel", "soñador", "suave", "valiente", "atento"] },
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function newPseudo(lang) {
  const w = WORDS[lang] || WORDS.fr;
  const n = 10 + Math.floor(Math.random() * 90);
  return lang === "en" ? `${pick(w.b)} ${pick(w.a)} ${n}` : `${pick(w.a)} ${pick(w.b)} ${n}`;
}
export function currentPseudo(lang) {
  const saved = session.get("upa-pseudo");
  if (saved) return saved;
  const p = newPseudo(lang);
  session.set("upa-pseudo", p);
  return p;
}

export function timeAgo(iso, t, lang) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return t("time.now");
  if (s < 3600) return t("time.min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.h", { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  if (d === 1) return t("time.yesterday");
  if (d < 30) return t("time.days", { n: d });
  return new Date(iso).toLocaleDateString({ fr: "fr-FR", en: "en-GB", es: "es-ES" }[lang]);
}

export const excerpt = (text, n = 220) => (text.length > n ? text.slice(0, n).replace(/\s+\S*$/, "") + "…" : text);

// Mémorise les actions déjà faites dans ce navigateur (réactions, remerciements, signalements)
export function remembered(key) {
  const set = new Set(store.get(key, []));
  return {
    has: (id) => set.has(id),
    add: (id) => { set.add(id); store.set(key, [...set].slice(-500)); },
  };
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
