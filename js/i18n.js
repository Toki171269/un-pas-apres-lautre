// Moteur de traduction : FR (textes de index.html) / EN / ES (js/lang/*.js)
(function () {
  const LANGS = window.LANGS;
  const SUPPORTED = ["fr", "en", "es"];
  const ATTRS = [
    ["data-i18n", (el, v) => { el.textContent = v; }, (el) => el.textContent],
    ["data-i18n-html", (el, v) => { el.innerHTML = v; }, (el) => el.innerHTML], // textes de confiance uniquement (nos fichiers)
    ["data-i18n-ph", (el, v) => { el.placeholder = v; }, (el) => el.placeholder],
    ["data-i18n-aria", (el, v) => { el.setAttribute("aria-label", v); }, (el) => el.getAttribute("aria-label")],
    ["data-i18n-title", (el, v) => { el.title = v; }, (el) => el.title]
  ];

  // Le français de index.html sert de référence
  const defaults = {};
  for (const [attr, , get] of ATTRS) {
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const k = el.getAttribute(attr);
      if (!(k in defaults)) defaults[k] = get(el);
    });
  }

  function initial() {
    try { const s = localStorage.getItem("lueur-lang"); if (SUPPORTED.includes(s)) return s; } catch {}
    const nav = (navigator.language || "fr").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : "fr";
  }
  let lang = initial();

  function t(key, vars) {
    const ui = (LANGS[lang] && LANGS[lang].ui) || {};
    let s = ui[key] ?? (lang === "fr" ? defaults[key] : undefined) ?? LANGS.fr.ui[key] ?? defaults[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }

  function apply() {
    document.documentElement.lang = lang;
    for (const [attr, set] of ATTRS) {
      document.querySelectorAll(`[${attr}]`).forEach((el) => set(el, t(el.getAttribute(attr))));
    }
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }

  function setLang(l) {
    if (!SUPPORTED.includes(l) || l === lang) return;
    lang = l;
    try { localStorage.setItem("lueur-lang", l); } catch {}
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: l }));
  }

  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  apply();

  window.I18N = {
    t, setLang, apply,
    get lang() { return lang; },
    get content() { return LANGS[lang]; }
  };
})();
