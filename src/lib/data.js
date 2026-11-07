// Données indépendantes de la langue. Les libellés sont dans src/i18n/*.js

export const CATEGORIES = [
  "rupture", "deuil", "solitude", "famille", "trahison", "confiance",
  "echec", "finances", "violences", "maletre", "relations", "autre", "inconnu",
];

export const SPACES = ["rupture", "deuil", "solitude", "famille", "reconstruction", "espoir"];
export const SPACE_OF = {
  rupture: "rupture", trahison: "rupture", deuil: "deuil", solitude: "solitude",
  famille: "famille", relations: "famille", confiance: "reconstruction", echec: "reconstruction",
};

export const REACTIONS = ["courage", "avec", "ecoute", "meilleur", "pense"];
export const REPORT_REASONS = ["harcelement", "menaces", "haine", "manipulation", "donnees", "spam", "conseils", "autodestruction", "inapproprie"];
export const HOPE_FIELDS = ["situation", "difficultes", "pire", "aide", "soutien", "aujourdhui", "message"];
export const LETTER_TYPES = ["deceased", "ex", "hurt", "loved", "self", "future"];

const u = (id, w = 800, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=70`;
export const IMG = {
  hero: u("1508672019048-805c876b67e2", 1800),
  rupture: u("1518199266791-5375a83190b7", 700, 400),
  deuil: u("1476611338391-6f395a0ebc7b", 700, 400),
  solitude: u("1527137342181-19aab11a8ee8", 700, 400),
  famille: u("1511632765486-a01980e01a18", 700, 400),
  reconstruction: u("1499209974431-9dddcece7f88", 700, 400),
  espoir: u("1470252649378-9c29740c9fa8", 700, 400),
  breath: u("1506126613408-eca07ce68773", 800),
  letter: u("1519834785169-98be25ec3f84", 800),
  hands: u("1544027993-37dbfe43562a", 600),
  heart: u("1516589178581-6cd7833ae3b2", 600),
  flowers: u("1455659817273-f96807779a8a", 600),
};

// Lignes d'écoute par pays. À VÉRIFIER régulièrement (voir README).
// emergency = numéro d'urgence général ; crisis = ligne de crise principale.
export const HELP_UPDATED = "2026-11";
export const COUNTRIES = [
  { id: "FR", name: { fr: "France", en: "France", es: "Francia" }, emergency: "112 · 15 · 17", lines: [
    { num: "3114", crisis: true, desc: { fr: "Prévention du suicide · 24h/24, gratuit", en: "Suicide prevention · 24/7, free", es: "Prevención del suicidio · 24 h, gratis" } },
    { num: "09 72 39 40 50", desc: { fr: "SOS Amitié · écoute 24h/24", en: "SOS Amitié · listening line 24/7", es: "SOS Amitié · escucha 24 h" } },
    { num: "0 800 235 236", desc: { fr: "Fil Santé Jeunes (12–25 ans)", en: "Fil Santé Jeunes (ages 12–25)", es: "Fil Santé Jeunes (12–25 años)" } },
    { num: "3919", desc: { fr: "Violences faites aux femmes", en: "Violence against women", es: "Violencia contra las mujeres" } },
    { num: "119", desc: { fr: "Enfance en danger", en: "Children in danger", es: "Infancia en peligro" } },
    { num: "116 006", desc: { fr: "Aide aux victimes", en: "Victim support", es: "Ayuda a las víctimas" } },
  ]},
  { id: "BE", name: { fr: "Belgique", en: "Belgium", es: "Bélgica" }, emergency: "112", lines: [
    { num: "0800 32 123", crisis: true, desc: { fr: "Centre de Prévention du Suicide · 24h/24", en: "Suicide Prevention Centre · 24/7", es: "Centro de Prevención del Suicidio · 24 h" } },
    { num: "107", desc: { fr: "Télé-Accueil · écoute", en: "Télé-Accueil · listening line", es: "Télé-Accueil · escucha" } },
  ]},
  { id: "CH", name: { fr: "Suisse", en: "Switzerland", es: "Suiza" }, emergency: "112 · 144", lines: [
    { num: "143", crisis: true, desc: { fr: "La Main Tendue · 24h/24", en: "La Main Tendue · 24/7", es: "La Main Tendue · 24 h" } },
    { num: "147", desc: { fr: "Pro Juventute (jeunes)", en: "Pro Juventute (young people)", es: "Pro Juventute (jóvenes)" } },
  ]},
  { id: "CA", name: { fr: "Canada", en: "Canada", es: "Canadá" }, emergency: "911", lines: [
    { num: "988", crisis: true, desc: { fr: "Prévention du suicide · appel ou texto, 24h/24", en: "Suicide Crisis Helpline · call or text, 24/7", es: "Línea de crisis suicida · llamada o SMS, 24 h" } },
    { num: "1 866 277-3553", desc: { fr: "1 866 APPELLE (Québec)", en: "1 866 APPELLE (Quebec, French)", es: "1 866 APPELLE (Quebec, francés)" } },
  ]},
  { id: "US", name: { fr: "États-Unis", en: "United States", es: "Estados Unidos" }, emergency: "911", lines: [
    { num: "988", crisis: true, desc: { fr: "Suicide & Crisis Lifeline · appel ou SMS", en: "Suicide & Crisis Lifeline · call or text", es: "Suicide & Crisis Lifeline · llamada o SMS (también en español)" } },
    { num: "1-800-799-7233", desc: { fr: "Violences conjugales", en: "National Domestic Violence Hotline", es: "Violencia doméstica" } },
  ]},
  { id: "GB", name: { fr: "Royaume-Uni / Irlande", en: "UK / Ireland", es: "Reino Unido / Irlanda" }, emergency: "999 · 112", lines: [
    { num: "116 123", crisis: true, desc: { fr: "Samaritans · gratuit, 24h/24", en: "Samaritans · free, 24/7", es: "Samaritans · gratis, 24 h" } },
    { num: "0808 2000 247", desc: { fr: "Violences domestiques (Royaume-Uni)", en: "National Domestic Abuse Helpline (UK)", es: "Violencia doméstica (Reino Unido)" } },
  ]},
  { id: "AU", name: { fr: "Australie", en: "Australia", es: "Australia" }, emergency: "000", lines: [
    { num: "13 11 14", crisis: true, desc: { fr: "Lifeline · 24h/24", en: "Lifeline · 24/7", es: "Lifeline · 24 h" } },
  ]},
  { id: "ES", name: { fr: "Espagne", en: "Spain", es: "España" }, emergency: "112", lines: [
    { num: "024", crisis: true, desc: { fr: "Ligne de prévention du suicide · 24h/24", en: "Suicide prevention line · 24/7", es: "Línea de atención a la conducta suicida · 24 h" } },
    { num: "717 003 717", desc: { fr: "Teléfono de la Esperanza", en: "Teléfono de la Esperanza", es: "Teléfono de la Esperanza" } },
    { num: "016", desc: { fr: "Violences de genre", en: "Gender-based violence", es: "Violencia de género" } },
  ]},
  { id: "MX", name: { fr: "Mexique", en: "Mexico", es: "México" }, emergency: "911", lines: [
    { num: "800 911 2000", crisis: true, desc: { fr: "Línea de la Vida · 24h/24", en: "Línea de la Vida · 24/7", es: "Línea de la Vida · 24 h" } },
  ]},
  { id: "AR", name: { fr: "Argentine", en: "Argentina", es: "Argentina" }, emergency: "911 · 107", lines: [
    { num: "135", crisis: true, desc: { fr: "Centre d'assistance au suicide (Buenos Aires)", en: "Suicide assistance centre (Buenos Aires)", es: "Centro de Asistencia al Suicida (CABA y GBA)" } },
    { num: "0800 345 1435", desc: { fr: "Même service, tout le pays", en: "Same service, nationwide", es: "Mismo servicio, todo el país" } },
  ]},
  { id: "XX", name: { fr: "Autre pays", en: "Another country", es: "Otro país" }, emergency: "112 · 911", lines: [
    { num: "findahelpline.com", href: "https://findahelpline.com/", crisis: true, desc: { fr: "Lignes d'écoute gratuites dans plus de 130 pays", en: "Free helplines in 130+ countries", es: "Líneas gratuitas en más de 130 países" } },
  ]},
];

export function guessCountry(lang) {
  const region = (navigator.language || "").split("-")[1]?.toUpperCase();
  if (region === "IE") return "GB";
  if (COUNTRIES.some((c) => c.id === region)) return region;
  return { fr: "FR", en: "US", es: "ES" }[lang] || "XX";
}
export const telHref = (num) => "tel:" + num.replace(/[^\d+]/g, "");

// Mots de détresse (FR/EN/ES) : filet de sécurité côté navigateur, indépendant de l'IA
export const CRISIS_RE = new RegExp([
  "suicid", "me tuer", "en finir", "mettre fin à (mes jours|ma vie)", "plus envie de vivre", "envie de mourir", "veux mourir",
  "me faire du mal", "scarif", "plus la force de vivre",
  "kill myself", "end it all", "end my life", "want to die", "don'?t want to (live|be alive)", "hurt myself", "self[- ]harm", "cut myself",
  "matarme", "quitarme la vida", "acabar con todo", "quiero morir", "no quiero vivir", "hacerme daño", "autolesi", "cortarme",
].join("|"), "i");
