// Données communes à toutes les langues.
// Les textes traduits sont dans js/lang/fr.js, en.js, es.js.
window.LUEUR_DATA = {
  // Photo Unsplash associée à chaque épreuve
  images: {
    deuil: "1476611338391-6f395a0ebc7b",
    rupture: "1518199266791-5375a83190b7",
    solitude: "1527137342181-19aab11a8ee8",
    depression: "1441974231531-c6227db76b6e",
    anxiete: "1507525428034-b723cf961d3e",
    maladie: "1455659817273-f96807779a8a",
    trauma: "1544027993-37dbfe43562a",
    effondrement: "1499209974431-9dddcece7f88"
  },

  // Couleurs (sourdes) des catégories sur le mur
  couleurs: {
    deuil: "#7d7a9c", rupture: "#a8848a", solitude: "#7792a6", depression: "#6f7784",
    anxiete: "#6f98a0", maladie: "#859a86", trauma: "#a08a6c", effondrement: "#9a8f70", autre: "#5c6b7d"
  },

  // Mots de détresse (FR / EN / ES) qui déclenchent la fenêtre de soutien
  detresse: new RegExp([
    "suicid", "me tuer", "en finir", "mettre fin à mes jours", "plus envie de vivre", "envie de mourir", "veux mourir",
    "me faire du mal", "scarif", "plus la force de vivre",
    "kill myself", "end it all", "end my life", "want to die", "don'?t want to live", "hurt myself", "self[- ]harm", "cut myself",
    "matarme", "quitarme la vida", "acabar con todo", "quiero morir", "no quiero vivir", "hacerme daño", "autolesi", "cortarme"
  ].join("|"), "i"),

  // Lignes d'écoute gratuites. "langs" sert à afficher d'abord les pays de la langue choisie.
  // "crisis: true" = proposé dans la fenêtre de soutien et le pied de page. Vérifie les numéros régulièrement.
  lignes: [
    { langs: ["fr"], pays: { fr: "France", en: "France", es: "Francia" }, items: [
      { num: "3114", tel: "3114", crisis: true, desc: { fr: "Prévention du suicide · 24h/24", en: "Suicide prevention · 24/7", es: "Prevención del suicidio · 24 h" } },
      { num: "09 72 39 40 50", tel: "0972394050", desc: { fr: "SOS Amitié · écoute 24h/24", en: "SOS Amitié · listening line 24/7", es: "SOS Amitié · escucha 24 h" } },
      { num: "0 800 235 236", tel: "0800235236", desc: { fr: "Fil Santé Jeunes (12–25 ans)", en: "Fil Santé Jeunes (ages 12–25)", es: "Fil Santé Jeunes (12–25 años)" } },
      { num: "3919", tel: "3919", desc: { fr: "Violences faites aux femmes", en: "Violence against women", es: "Violencia contra las mujeres" } }
    ]},
    { langs: ["fr"], pays: { fr: "Belgique", en: "Belgium", es: "Bélgica" }, items: [
      { num: "0800 32 123", tel: "080032123", crisis: true, desc: { fr: "Centre de Prévention du Suicide · 24h/24", en: "Suicide Prevention Centre · 24/7", es: "Centro de Prevención del Suicidio · 24 h" } },
      { num: "107", tel: "107", desc: { fr: "Télé-Accueil · écoute", en: "Télé-Accueil · listening line", es: "Télé-Accueil · escucha" } }
    ]},
    { langs: ["fr"], pays: { fr: "Suisse", en: "Switzerland", es: "Suiza" }, items: [
      { num: "143", tel: "143", crisis: true, desc: { fr: "La Main Tendue · 24h/24", en: "La Main Tendue · 24/7", es: "La Main Tendue · 24 h" } },
      { num: "147", tel: "147", desc: { fr: "Pro Juventute (jeunes)", en: "Pro Juventute (young people)", es: "Pro Juventute (jóvenes)" } }
    ]},
    { langs: ["en"], pays: { fr: "États-Unis", en: "United States", es: "Estados Unidos" }, items: [
      { num: "988", tel: "988", crisis: true, desc: { fr: "Suicide & Crisis Lifeline · appel ou SMS", en: "Suicide & Crisis Lifeline · call or text", es: "Suicide & Crisis Lifeline · llamada o SMS (también en español)" } },
      { num: "1-800-799-7233", tel: "18007997233", desc: { fr: "Violences conjugales", en: "National Domestic Violence Hotline", es: "Violencia doméstica" } }
    ]},
    { langs: ["en"], pays: { fr: "Royaume-Uni / Irlande", en: "UK / Ireland", es: "Reino Unido / Irlanda" }, items: [
      { num: "116 123", tel: "116123", crisis: true, desc: { fr: "Samaritans · gratuit, 24h/24", en: "Samaritans · free, 24/7", es: "Samaritans · gratis, 24 h" } }
    ]},
    { langs: ["fr", "en"], pays: { fr: "Canada / Québec", en: "Canada", es: "Canadá" }, items: [
      { num: "988", tel: "988", crisis: true, desc: { fr: "Prévention du suicide · 24h/24", en: "Suicide Crisis Helpline · 24/7", es: "Línea de crisis suicida · 24 h" } },
      { num: "1 866 277-3553", tel: "18662773553", desc: { fr: "1 866 APPELLE (Québec)", en: "1 866 APPELLE (Quebec, French)", es: "1 866 APPELLE (Quebec, francés)" } }
    ]},
    { langs: ["en"], pays: { fr: "Australie", en: "Australia", es: "Australia" }, items: [
      { num: "13 11 14", tel: "131114", crisis: true, desc: { fr: "Lifeline · 24h/24", en: "Lifeline · 24/7", es: "Lifeline · 24 h" } }
    ]},
    { langs: ["es"], pays: { fr: "Espagne", en: "Spain", es: "España" }, items: [
      { num: "024", tel: "024", crisis: true, desc: { fr: "Ligne de prévention du suicide · 24h/24", en: "Suicide prevention line · 24/7", es: "Línea de atención a la conducta suicida · 24 h" } },
      { num: "717 003 717", tel: "717003717", desc: { fr: "Teléfono de la Esperanza", en: "Teléfono de la Esperanza", es: "Teléfono de la Esperanza" } },
      { num: "016", tel: "016", desc: { fr: "Violences de genre", en: "Gender-based violence", es: "Violencia de género" } }
    ]},
    { langs: ["es"], pays: { fr: "Mexique", en: "Mexico", es: "México" }, items: [
      { num: "800 911 2000", tel: "8009112000", crisis: true, desc: { fr: "Línea de la Vida · 24h/24", en: "Línea de la Vida · 24/7", es: "Línea de la Vida · 24 h" } }
    ]},
    { langs: ["es"], pays: { fr: "Argentine", en: "Argentina", es: "Argentina" }, items: [
      { num: "135", tel: "135", crisis: true, desc: { fr: "Centre d'assistance au suicide (Buenos Aires)", en: "Suicide assistance centre (Buenos Aires)", es: "Centro de Asistencia al Suicida (CABA y GBA)" } },
      { num: "0800 345 1435", tel: "08003451435", desc: { fr: "Même service, tout le pays", en: "Same service, nationwide", es: "Mismo servicio, todo el país" } }
    ]},
    { langs: [], pays: { fr: "Partout", en: "Everywhere", es: "En todas partes" }, items: [
      { num: "112", tel: "112", crisis: true, desc: { fr: "Urgences (Europe et de nombreux pays)", en: "Emergency (Europe and many countries)", es: "Emergencias (Europa y muchos países)" } },
      { num: "findahelpline.com", href: "https://findahelpline.com/", desc: { fr: "Lignes d'écoute dans le monde entier", en: "Helplines worldwide", es: "Líneas de ayuda en todo el mundo" } }
    ]}
  ]
};
