(function () {
  const C = window.LUEUR_CONTENT;
  const api = window.LUEUR_API;
  const $ = (s, el = document) => el.querySelector(s);

  // Petit utilitaire de création d'éléments (le texte utilisateur passe toujours par textContent)
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c != null) el.append(c);
    return el;
  }
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    const d = Math.floor(s / 86400);
    return d === 1 ? "hier" : d < 30 ? `il y a ${d} jours` : new Date(iso).toLocaleDateString("fr-FR");
  }
  function setMsg(el, text, kind) { el.textContent = text; el.className = "form-msg " + (kind || ""); }

  // ---------- Thème ----------
  const root = document.documentElement;
  const savedTheme = store.get("lueur-theme", null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $("#theme-toggle").addEventListener("click", () => {
    const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next; store.set("lueur-theme", next);
  });

  // ---------- Quitter vite ----------
  function quickExit() {
    try { sessionStorage.clear(); } catch {}
    window.open("https://www.google.com/search?q=m%C3%A9t%C3%A9o", "_blank", "noopener");
    location.replace("https://www.google.com/search?q=recette+facile");
  }
  $("#quick-exit").addEventListener("click", quickExit);
  let escTimes = [];
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const now = Date.now();
    escTimes = escTimes.filter((t) => now - t < 1200).concat(now);
    if (escTimes.length >= 3) quickExit();
  });

  // ---------- Lumière du jour ----------
  const hopeEl = $("#hope-text");
  let hopeIdx = Math.floor(Date.now() / 864e5) % C.espoir.length; // une par jour
  function showHope() {
    hopeEl.style.opacity = 0;
    setTimeout(() => { hopeEl.textContent = "« " + C.espoir[hopeIdx] + " »"; hopeEl.style.opacity = 1; }, 250);
  }
  showHope();
  $("#hope-next").addEventListener("click", () => {
    let n; do { n = Math.floor(Math.random() * C.espoir.length); } while (n === hopeIdx && C.espoir.length > 1);
    hopeIdx = n; showHope();
  });

  // ---------- Ce que je traverse ----------
  const cardsEl = $("#epreuves");
  const detailEl = $("#epreuve-detail");
  C.epreuves.forEach((ep) => {
    cardsEl.append(h("button", { class: "epreuve-card", "aria-expanded": "false", "aria-controls": "epreuve-detail", onclick: () => openEpreuve(ep) },
      h("span", { class: "ep-img", style: `background-image:url('https://images.unsplash.com/photo-${ep.img}?auto=format&fit=crop&w=600&h=320&q=70')` },
        h("span", { class: "ep-emoji", "aria-hidden": "true" }, ep.emoji)),
      h("span", { class: "ep-body" },
        h("strong", {}, ep.titre),
        h("span", { class: "sub" }, ep.sous),
        h("span", { class: "mini-btn" }, "Lire →"))));
    $("#feel-select").append(h("option", { value: ep.id }, ep.emoji + "  " + ep.titre + " — " + ep.sous));
  });
  $("#feel-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const ep = C.epreuves.find((x) => x.id === $("#feel-select").value);
    if (!ep) { $("#traverser").scrollIntoView({ behavior: "smooth" }); return; }
    if (detailEl.dataset.id === ep.id && !detailEl.hidden) detailEl.hidden = true;
    openEpreuve(ep, true);
  });
  function openEpreuve(ep, scrollTop) {
    const already = detailEl.dataset.id === ep.id && !detailEl.hidden;
    cardsEl.querySelectorAll(".epreuve-card").forEach((b, i) => b.setAttribute("aria-expanded", String(!already && C.epreuves[i].id === ep.id)));
    if (already) { detailEl.hidden = true; return; }
    const doneKey = "lueur-steps-" + ep.id + "-" + new Date().toDateString();
    const done = store.get(doneKey, []);
    detailEl.dataset.id = ep.id;
    detailEl.replaceChildren(
      h("div", {},
        h("h3", {}, ep.emoji + " " + ep.titre),
        h("p", { class: "validation" }, ep.validation),
        h("h4", {}, "C'est normal"),
        h("p", {}, ep.normal),
        h("h4", {}, "Quand demander de l'aide"),
        h("p", {}, ep.aide)),
      h("div", {},
      h("h4", {}, "Trois petites choses pour aujourd'hui"),
      h("ul", { class: "steps" }, ep.etapes.map((t, i) => {
        const li = h("li", { class: done.includes(i) ? "done" : "" });
        const cb = h("input", { type: "checkbox", id: `step-${ep.id}-${i}`, checked: done.includes(i) });
        cb.addEventListener("change", () => {
          const cur = store.get(doneKey, []).filter((x) => x !== i);
          if (cb.checked) cur.push(i);
          store.set(doneKey, cur); li.classList.toggle("done", cb.checked);
        });
        li.append(cb, h("label", { for: cb.id }, h("span", {}, t)));
        return li;
      })),
      h("p", { style: "margin-top:22px" }, h("a", { class: "btn btn-pink", href: "#mur", onclick: () => { $("#post-category").value = ep.id; } }, "Déposer ce que je ressens →")))
    );
    detailEl.hidden = false;
    detailEl.focus({ preventScroll: true });
    detailEl.scrollIntoView({ behavior: "smooth", block: scrollTop ? "start" : "nearest" });
  }

  // ---------- Respiration ----------
  const circle = $("#breath-circle"), label = $("#breath-label"), toggle = $("#breath-toggle"), countEl = $("#breath-count");
  const MODES = {
    coherence: [["Inspire…", 5, 1], ["Expire…", 5, .6]],
    carre: [["Inspire…", 4, 1], ["Retiens…", 4, 1], ["Expire…", 4, .6], ["Retiens…", 4, .6]]
  };
  let mode = "coherence", timer = null, startedAt = 0, tick = null;
  document.querySelectorAll(".segmented button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".segmented button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    mode = b.dataset.mode;
    if (timer) { stopBreath(); startBreath(); }
  }));
  function startBreath() {
    let i = 0; startedAt = Date.now();
    const step = () => {
      const [txt, sec, scale] = MODES[mode][i % MODES[mode].length];
      label.textContent = txt;
      circle.style.transitionDuration = sec + "s";
      circle.style.transform = `scale(${scale})`;
      i++; timer = setTimeout(step, sec * 1000);
    };
    step();
    toggle.textContent = "Arrêter";
    tick = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      countEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` + (s >= 180 ? " · Bravo. Tu peux continuer ou t'arrêter quand tu veux." : "");
    }, 1000);
  }
  function stopBreath() {
    clearTimeout(timer); clearInterval(tick); timer = null;
    circle.style.transitionDuration = "1.2s"; circle.style.transform = "scale(.6)";
    label.textContent = "Prêt·e ?"; toggle.textContent = "Commencer";
  }
  toggle.addEventListener("click", () => (timer ? stopBreath() : startBreath()));

  // ---------- Mur des fardeaux ----------
  const catSelect = $("#post-category"), filtersEl = $("#post-filters"), postsEl = $("#posts"), moreBtn = $("#posts-more");
  Object.entries(C.categories).forEach(([k, v]) => catSelect.append(h("option", { value: k }, v)));
  catSelect.value = "autre";
  let filter = "", offset = 0;
  const hugged = new Set(store.get("lueur-hugs", []));
  const reported = new Set(store.get("lueur-reports", []));

  [["", "Tous"], ...Object.entries(C.categories)].forEach(([k, v]) => {
    filtersEl.append(h("button", { class: "chip", "aria-pressed": String(k === filter), "data-cat": k, onclick: (e) => {
      filter = k;
      filtersEl.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === e.currentTarget)));
      loadPosts(true);
    } }, v));
  });

  function renderPost(p) {
    const repliesEl = h("div", { class: "replies" }, (p.replies || []).map(renderReply));
    const hugBtn = h("button", { class: "hug-btn", "aria-pressed": String(hugged.has(p.id)), title: "Envoyer du soutien" }, `🤍 ${p.hugs}`);
    hugBtn.addEventListener("click", async () => {
      if (hugged.has(p.id)) return;
      hugged.add(p.id); store.set("lueur-hugs", [...hugged]);
      hugBtn.setAttribute("aria-pressed", "true"); hugBtn.textContent = `🤍 ${++p.hugs}`;
      try { const n = await api.hug(p.id); if (typeof n === "number") hugBtn.textContent = `🤍 ${n}`; } catch {}
    });
    const input = h("input", { maxlength: "500", placeholder: "Un mot doux, bienveillant…", "aria-label": "Répondre avec un mot doux" });
    const replyForm = h("form", { class: "reply-form", hidden: true }, input, h("button", { class: "btn btn-primary", type: "submit" }, "Envoyer"));
    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = input.value.trim(); if (content.length < 2) return;
      replyForm.querySelector("button").disabled = true;
      try { repliesEl.append(renderReply(await api.createReply(p.id, content))); input.value = ""; replyForm.hidden = true; }
      catch (err) { input.value = content; input.placeholder = err.message; }
      replyForm.querySelector("button").disabled = false;
    });
    const n = (p.replies || []).length;
    return h("article", { class: "card post", style: `--cat:${C.couleurs[p.category] || C.couleurs.autre}` },
      h("div", { class: "post-head" },
        h("span", {}, h("span", { class: "who" }, p.pseudo || "Anonyme"), h("span", { class: "tag" }, C.categories[p.category] || "Autre")),
        h("time", { datetime: p.created_at }, timeAgo(p.created_at))),
      h("p", { class: "post-body" }, p.content),
      h("div", { class: "post-actions" },
        hugBtn,
        h("button", { class: "reply-toggle", onclick: () => { replyForm.hidden = !replyForm.hidden; if (!replyForm.hidden) input.focus(); } }, n ? `💬 ${n} · Répondre` : "💬 Répondre"),
        reportBtn("posts", p.id)),
      repliesEl, replyForm);
  }
  function renderReply(r) { return h("div", { class: "reply" }, r.content); }
  function reportBtn(kind, id) {
    const b = h("button", { class: "report-btn", title: "Signaler un contenu inapproprié" }, reported.has(id) ? "Signalé" : "Signaler");
    b.addEventListener("click", async () => {
      if (reported.has(id)) return;
      reported.add(id); store.set("lueur-reports", [...reported]); b.textContent = "Signalé, merci";
      try { await api.report(kind, id); } catch {}
    });
    return b;
  }

  async function loadPosts(reset) {
    if (reset) { offset = 0; postsEl.replaceChildren(h("p", { class: "empty" }, "Chargement…")); }
    try {
      const rows = await api.listPosts({ category: filter || null, offset });
      if (reset) postsEl.replaceChildren();
      rows.forEach((p) => postsEl.append(renderPost(p)));
      if (reset && !rows.length) postsEl.append(h("p", { class: "empty" }, "Aucun message ici pour l'instant. Tu peux être la première personne."));
      offset += rows.length;
      moreBtn.hidden = rows.length < api.PAGE;
    } catch (err) {
      postsEl.replaceChildren(h("p", { class: "empty" }, "Impossible de charger les messages pour le moment. " + err.message));
    }
  }
  moreBtn.addEventListener("click", () => loadPosts(false));

  const postForm = $("#post-form"), postContent = $("#post-content"), postMsg = $("#post-msg");
  postContent.addEventListener("input", () => { $("#post-chars").textContent = postContent.value.length; });
  const dialog = $("#care-dialog");
  let bypassCare = false;
  $("#care-continue").addEventListener("click", () => { dialog.close(); bypassCare = true; postForm.requestSubmit(); });
  $("#care-see").addEventListener("click", () => dialog.close());

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();
    if (content.length < 3) return setMsg(postMsg, "Écris au moins quelques mots.", "err");
    if (!bypassCare && C.detresse.test(content)) { dialog.showModal(); return; }
    bypassCare = false;
    const btn = postForm.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const row = await api.createPost({ content, pseudo: $("#post-pseudo").value.trim() || null, category: catSelect.value });
      if (!filter || filter === row.category) { $(".empty", postsEl)?.remove(); postsEl.prepend(renderPost(row)); }
      postForm.reset(); catSelect.value = "autre"; $("#post-chars").textContent = "0";
      setMsg(postMsg, "Merci de l'avoir déposé ici. Ce que tu portes est un peu moins lourd quand on le partage. 🤍", "ok");
    } catch (err) { setMsg(postMsg, err.message, "err"); }
    btn.disabled = false;
  });

  // ---------- Bougies ----------
  const candlesEl = $("#candles"), candleCount = $("#candle-count");
  function renderCandle(c) {
    return h("div", { class: "candle" },
      reportBtn("candles", c.id),
      h("div", { class: "wax" }, h("span", { class: "flame", "aria-hidden": "true" })),
      h("strong", {}, c.name),
      c.message ? h("p", {}, c.message) : null);
  }
  async function loadCandles() {
    try {
      const [rows, n] = await Promise.all([api.listCandles(), api.countCandles()]);
      candlesEl.replaceChildren(...rows.map(renderCandle));
      candleCount.textContent = n;
    } catch (err) { candlesEl.replaceChildren(h("p", { class: "muted" }, "Les bougies ne peuvent pas s'afficher pour le moment.")); }
  }
  $("#candle-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#candle-msg-status"), btn = e.target.querySelector("button");
    const name = $("#candle-name").value.trim(); if (!name) return;
    btn.disabled = true;
    try {
      const row = await api.createCandle({ name, message: $("#candle-msg").value.trim() || null });
      candlesEl.prepend(renderCandle(row));
      candleCount.textContent = Number(candleCount.textContent) + 1;
      e.target.reset();
      setMsg(status, "Ta bougie brille maintenant, pour " + row.name + ".", "ok");
    } catch (err) { setMsg(status, err.message, "err"); }
    btn.disabled = false;
  });

  // ---------- Lettre jamais envoyée ----------
  const letter = $("#letter"), after = $("#letter-after");
  $("#letter-release").addEventListener("click", () => {
    if (!letter.value.trim()) { letter.focus(); return; }
    letter.classList.add("releasing");
    setTimeout(() => {
      letter.value = ""; letter.classList.remove("releasing");
      after.hidden = false;
    }, 2400);
  });
  letter.addEventListener("input", () => { after.hidden = true; });

  // ---------- Lignes d'écoute ----------
  $("#helplines").append(...C.lignes.map((g) => h("div", { class: "card helpline" },
    h("h3", {}, g.pays),
    h("ul", {}, g.items.map((it) => h("li", {},
      h("a", { class: "num", href: it.href || "tel:" + it.tel, target: it.href ? "_blank" : null, rel: it.href ? "noopener" : null }, it.num),
      h("span", { class: "desc" }, it.desc)))))));

  // ---------- Démarrage ----------
  $("#mode-info").textContent = api.mode === "demo"
    ? "Mode démo : les messages restent dans ce navigateur. Configure Supabase dans js/config.js pour les partager."
    : "";
  loadPosts(true);
  loadCandles();
})();
