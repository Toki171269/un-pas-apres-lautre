(function () {
  const D = window.LUEUR_DATA;
  const I = window.I18N;
  const t = I.t;
  const api = window.LUEUR_API;
  const $ = (s, el = document) => el.querySelector(s);
  const L = () => I.content; // contenu de la langue courante

  // Création d'éléments (le texte des visiteurs passe toujours par textContent)
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
    if (s < 60) return t("time.now");
    if (s < 3600) return t("time.min", { n: Math.floor(s / 60) });
    if (s < 86400) return t("time.h", { n: Math.floor(s / 3600) });
    const d = Math.floor(s / 86400);
    return d === 1 ? t("time.yesterday") : d < 30 ? t("time.days", { n: d }) : new Date(iso).toLocaleDateString(t("locale"));
  }
  function setMsg(el, text, kind) { el.textContent = text; el.className = el.className.replace(/\b(ok|err)\b/g, "").trim() + " " + (kind || ""); }
  const img = (id, w, hgt) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${hgt ? "&h=" + hgt : ""}&q=70`;

  // Lignes d'écoute triées : pays de la langue courante d'abord
  function sortedLines() {
    return [...D.lignes].sort((a, b) => (b.langs.includes(I.lang) - a.langs.includes(I.lang)) || (a.langs.length === 0) - (b.langs.length === 0));
  }
  function crisisLines(max) {
    const out = [];
    for (const g of sortedLines()) for (const it of g.items) if (it.crisis && out.length < max) out.push({ ...it, pays: g.pays[I.lang] });
    return out;
  }

  // ---------- Thème ----------
  const root = document.documentElement;
  const savedTheme = store.get("lueur-theme", null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $("#theme-toggle").addEventListener("click", () => {
    const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = isDark ? "light" : "dark";
    store.set("lueur-theme", root.dataset.theme);
  });

  // ---------- Quitter vite ----------
  function quickExit() {
    try { sessionStorage.clear(); } catch {}
    location.replace("https://www.google.com/search?q=meteo");
  }
  $("#quick-exit").addEventListener("click", quickExit);
  let escTimes = [];
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const now = Date.now();
    escTimes = escTimes.filter((x) => now - x < 1200).concat(now);
    if (escTimes.length >= 3) quickExit();
  });

  // ---------- Lumière du jour ----------
  const hopeEl = $("#hope-text");
  let hopeIdx = Math.floor(Date.now() / 864e5) % L().espoir.length;
  function showHope(fade) {
    const [o, c] = I.lang === "en" ? ["“", "”"] : ["« ", " »"];
    const set = () => { hopeEl.textContent = o + L().espoir[hopeIdx] + c; hopeEl.style.opacity = 1; };
    if (!fade) return set();
    hopeEl.style.opacity = 0; setTimeout(set, 250);
  }
  $("#hope-next").addEventListener("click", () => {
    const n = L().espoir.length;
    hopeIdx = (hopeIdx + 1 + Math.floor(Math.random() * (n - 1))) % n;
    showHope(true);
  });

  // ---------- Ce que je traverse ----------
  const cardsEl = $("#epreuves"), detailEl = $("#epreuve-detail"), feelSel = $("#feel-select");
  function renderEpreuves() {
    const openId = detailEl.hidden ? null : detailEl.dataset.id;
    cardsEl.replaceChildren(...L().epreuves.map((ep) =>
      h("button", { class: "epreuve-card", "aria-expanded": String(ep.id === openId), "aria-controls": "epreuve-detail", "data-id": ep.id, onclick: () => toggleEpreuve(ep.id) },
        h("span", { class: "ep-img photo", style: `background-image:url('${img(D.images[ep.id], 600, 320)}')` }),
        h("span", { class: "ep-body" },
          h("strong", {}, ep.titre),
          h("span", { class: "sub" }, ep.sous),
          h("span", { class: "mini-link" }, t("ep.read"))))));
    const first = feelSel.options[0];
    feelSel.replaceChildren(first, ...L().epreuves.map((ep) => h("option", { value: ep.id }, ep.titre + " — " + ep.sous)));
    if (openId) renderDetail(openId);
  }
  function toggleEpreuve(id) {
    if (!detailEl.hidden && detailEl.dataset.id === id) { detailEl.hidden = true; markCards(null); return; }
    renderDetail(id); scrollDetail("nearest");
  }
  function markCards(id) { cardsEl.querySelectorAll(".epreuve-card").forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.id === id))); }
  function scrollDetail(block) { detailEl.focus({ preventScroll: true }); detailEl.scrollIntoView({ behavior: "smooth", block }); }
  function renderDetail(id) {
    const ep = L().epreuves.find((x) => x.id === id);
    const doneKey = "lueur-steps-" + id + "-" + new Date().toDateString();
    const done = store.get(doneKey, []);
    detailEl.dataset.id = id;
    detailEl.replaceChildren(
      h("div", {},
        h("h3", {}, ep.titre),
        h("p", { class: "validation" }, ep.validation),
        h("h4", {}, t("ep.normal")), h("p", {}, ep.normal),
        h("h4", {}, t("ep.help")), h("p", {}, ep.aide)),
      h("div", {},
        h("h4", {}, t("ep.steps")),
        h("ul", { class: "steps" }, ep.etapes.map((txt, i) => {
          const li = h("li", { class: done.includes(i) ? "done" : "" });
          const cb = h("input", { type: "checkbox", id: `step-${id}-${i}`, checked: done.includes(i) });
          cb.addEventListener("change", () => {
            const cur = store.get(doneKey, []).filter((x) => x !== i);
            if (cb.checked) cur.push(i);
            store.set(doneKey, cur); li.classList.toggle("done", cb.checked);
          });
          li.append(cb, h("label", { for: cb.id }, h("span", {}, txt)));
          return li;
        })),
        h("p", { class: "detail-cta" }, h("a", { class: "btn btn-hope", href: "#mur", onclick: () => { $("#post-category").value = id; } }, t("ep.cta")))));
    detailEl.hidden = false;
    markCards(id);
  }
  $("#feel-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!feelSel.value) { $("#traverser").scrollIntoView({ behavior: "smooth" }); return; }
    renderDetail(feelSel.value); scrollDetail("start");
  });

  // ---------- Respiration ----------
  const circle = $("#breath-circle"), label = $("#breath-label"), toggle = $("#breath-toggle"), countEl = $("#breath-count");
  const MODES = {
    coherence: [["br.in", 5, 1], ["br.out", 5, .6]],
    carre: [["br.in", 4, 1], ["br.hold", 4, 1], ["br.out", 4, .6], ["br.hold", 4, .6]]
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
      const [key, sec, scale] = MODES[mode][i % MODES[mode].length];
      label.textContent = t(key);
      circle.style.transitionDuration = sec + "s";
      circle.style.transform = `scale(${scale})`;
      i++; timer = setTimeout(step, sec * 1000);
    };
    step();
    toggle.textContent = t("br.stop");
    tick = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      countEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` + (s >= 180 ? " · " + t("br.bravo") : "");
    }, 1000);
  }
  function stopBreath() {
    clearTimeout(timer); clearInterval(tick); timer = null;
    circle.style.transitionDuration = "1.2s"; circle.style.transform = "scale(.6)";
    label.textContent = t("br.ready"); toggle.textContent = t("br.start"); countEl.textContent = t("br.count");
  }
  toggle.addEventListener("click", () => (timer ? stopBreath() : startBreath()));

  // ---------- Mur des fardeaux ----------
  const catSelect = $("#post-category"), filtersEl = $("#post-filters"), postsEl = $("#posts"), moreBtn = $("#posts-more");
  let filter = "", offset = 0;
  const hugged = new Set(store.get("lueur-hugs", []));
  const reported = new Set(store.get("lueur-reports", []));

  function renderCategories() {
    const cur = catSelect.value || "autre";
    catSelect.replaceChildren(...Object.entries(L().categories).map(([k, v]) => h("option", { value: k }, v)));
    catSelect.value = cur;
    filtersEl.setAttribute("aria-label", t("filter.aria"));
    filtersEl.replaceChildren(...[["", t("filter.all")], ...Object.entries(L().categories)].map(([k, v]) =>
      h("button", { class: "chip", "aria-pressed": String(k === filter), onclick: () => { filter = k; renderCategories(); loadPosts(true); } }, v)));
  }

  function hugLabel(n) { return `${t("post.hug")} · ${n}`; }
  function renderPost(p) {
    const repliesEl = h("div", { class: "replies" }, (p.replies || []).map(renderReply));
    const hugBtn = h("button", { class: "hug-btn", "aria-pressed": String(hugged.has(p.id)), title: t("hug.title") }, hugLabel(p.hugs));
    hugBtn.addEventListener("click", async () => {
      if (hugged.has(p.id)) return;
      hugged.add(p.id); store.set("lueur-hugs", [...hugged]);
      hugBtn.setAttribute("aria-pressed", "true"); hugBtn.textContent = hugLabel(++p.hugs);
      try { const n = await api.hug(p.id); if (typeof n === "number") hugBtn.textContent = hugLabel(n); } catch {}
    });
    const input = h("input", { maxlength: "500", placeholder: t("reply.ph"), "aria-label": t("reply.ph") });
    const sendBtn = h("button", { class: "btn btn-hope btn-sm", type: "submit" }, t("reply.send"));
    const replyForm = h("form", { class: "reply-form", hidden: true }, input, sendBtn);
    const n = (p.replies || []).length;
    const toggleBtn = h("button", { class: "reply-toggle", onclick: () => { replyForm.hidden = !replyForm.hidden; if (!replyForm.hidden) input.focus(); } }, n ? `${t("post.reply")} (${n})` : t("post.reply"));
    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = input.value.trim(); if (content.length < 2) return;
      sendBtn.disabled = true;
      try {
        p.replies = p.replies || [];
        const r = await api.createReply(p.id, content);
        p.replies.push(r); repliesEl.append(renderReply(r));
        toggleBtn.textContent = `${t("post.reply")} (${p.replies.length})`;
        input.value = ""; replyForm.hidden = true;
      } catch (err) { input.value = content; input.placeholder = err.message; }
      sendBtn.disabled = false;
    });
    return h("article", { class: "card post", style: `--cat:${D.couleurs[p.category] || D.couleurs.autre}` },
      h("div", { class: "post-head" },
        h("span", {}, h("span", { class: "who" }, p.pseudo || t("post.anon")), h("span", { class: "tag" }, L().categories[p.category] || L().categories.autre)),
        h("time", { datetime: p.created_at }, timeAgo(p.created_at))),
      h("p", { class: "post-body" }, p.content),
      h("div", { class: "post-actions" }, hugBtn, toggleBtn, reportBtn("posts", p.id)),
      repliesEl, replyForm);
  }
  function renderReply(r) { return h("div", { class: "reply" }, r.content); }
  function reportBtn(kind, id) {
    const b = h("button", { class: "report-btn", title: t("report.title") }, reported.has(id) ? t("post.reported") : t("post.report"));
    b.addEventListener("click", async () => {
      if (reported.has(id)) return;
      reported.add(id); store.set("lueur-reports", [...reported]); b.textContent = t("post.reported");
      try { await api.report(kind, id); } catch {}
    });
    return b;
  }

  async function loadPosts(reset) {
    if (reset) { offset = 0; postsEl.replaceChildren(h("p", { class: "empty" }, t("loading"))); }
    try {
      const rows = await api.listPosts({ category: filter || null, offset });
      if (reset) postsEl.replaceChildren();
      rows.forEach((p) => postsEl.append(renderPost(p)));
      if (reset && !rows.length) postsEl.append(h("p", { class: "empty" }, t("posts.empty")));
      offset += rows.length;
      moreBtn.hidden = rows.length < api.PAGE;
    } catch (err) {
      postsEl.replaceChildren(h("p", { class: "empty" }, t("posts.error")));
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
    if (content.length < 3) return setMsg(postMsg, t("post.short"), "err");
    if (!bypassCare && D.detresse.test(content)) { renderCareList(); dialog.showModal(); return; }
    bypassCare = false;
    const btn = postForm.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const row = await api.createPost({ content, pseudo: $("#post-pseudo").value.trim() || null, category: catSelect.value });
      if (!filter || filter === row.category) { $(".empty", postsEl)?.remove(); postsEl.prepend(renderPost(row)); }
      postForm.reset(); catSelect.value = "autre"; $("#post-chars").textContent = "0";
      setMsg(postMsg, t("post.ok"), "ok");
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
  let candleRows = [];
  async function loadCandles() {
    try {
      const [rows, n] = await Promise.all([api.listCandles(), api.countCandles()]);
      candleRows = rows;
      candlesEl.replaceChildren(...rows.map(renderCandle));
      candleCount.textContent = n;
    } catch { candlesEl.replaceChildren(h("p", {}, t("candles.error"))); }
  }
  $("#candle-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#candle-msg-status"), btn = e.target.querySelector("button");
    const name = $("#candle-name").value.trim(); if (!name) return;
    btn.disabled = true;
    try {
      const row = await api.createCandle({ name, message: $("#candle-msg").value.trim() || null });
      candleRows.unshift(row);
      candlesEl.prepend(renderCandle(row));
      candleCount.textContent = Number(candleCount.textContent) + 1;
      e.target.reset();
      setMsg(status, t("candle.ok", { name: row.name }), "ok");
    } catch (err) { setMsg(status, err.message, "err"); }
    btn.disabled = false;
  });

  // ---------- Lettre jamais envoyée ----------
  const letter = $("#letter"), after = $("#letter-after");
  $("#letter-release").addEventListener("click", () => {
    if (!letter.value.trim()) { letter.focus(); return; }
    letter.classList.add("releasing");
    setTimeout(() => { letter.value = ""; letter.classList.remove("releasing"); after.hidden = false; }, 2400);
  });
  letter.addEventListener("input", () => { after.hidden = true; });

  // ---------- Lignes d'écoute, pied de page, fenêtre de soutien ----------
  function renderHelplines() {
    $("#helplines").replaceChildren(...sortedLines().map((g) => h("div", { class: "card helpline" },
      h("h3", {}, g.pays[I.lang]),
      h("ul", {}, g.items.map((it) => h("li", {},
        h("a", { class: "num", href: it.href || "tel:" + it.tel, target: it.href ? "_blank" : null, rel: it.href ? "noopener" : null }, it.num),
        h("span", { class: "desc" }, it.desc[I.lang])))))));
    $("#footer-urg").replaceChildren(
      ...crisisLines(3).map((it) => h("a", { href: "tel:" + it.tel }, `${it.num} — ${it.pays}`)),
      h("a", { href: "#ecoute" }, t("helplines.all")));
  }
  function renderCareList() {
    $("#care-list").replaceChildren(...crisisLines(5).map((it) =>
      h("li", {}, h("a", { href: "tel:" + it.tel }, h("strong", {}, it.num)), ` — ${it.pays} · ${it.desc[I.lang]}`)));
  }

  // ---------- Rendu complet + changement de langue ----------
  function renderAll() {
    showHope(false);
    renderEpreuves();
    renderCategories();
    renderHelplines();
    candlesEl.querySelectorAll(".report-btn").forEach((b) => { b.title = t("report.title"); });
    if (!timer) stopBreath();
    $("#mode-info").textContent = api.mode === "demo" ? t("demo") : "";
  }
  document.addEventListener("langchange", () => {
    renderAll();
    loadPosts(true);
    candlesEl.replaceChildren(...candleRows.map(renderCandle));
  });

  renderAll();
  loadPosts(true);
  loadCandles();
})();
