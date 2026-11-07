// Accès aux données : Supabase (REST) si configuré, sinon mode démo local.
(function () {
  const cfg = window.LUEUR_CONFIG || {};
  const online = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const base = online ? cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1" : "";

  async function rest(path, { method = "GET", body, prefer } = {}) {
    const headers = {
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey,
      "Content-Type": "application/json"
    };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = (data && (data.message || data.hint)) || "Une erreur est survenue.";
      throw new Error(msg.includes("violates check constraint") ? "Message trop court ou trop long." : msg);
    }
    return data;
  }

  const PAGE = 20;

  const remote = {
    mode: "online",
    async listPosts({ category, offset = 0 } = {}) {
      let q = `/posts?select=id,created_at,pseudo,category,content,hugs,replies(id,created_at,content)` +
        `&order=created_at.desc&limit=${PAGE}&offset=${offset}` +
        `&replies.order=created_at.asc`;
      if (category) q += `&category=eq.${encodeURIComponent(category)}`;
      return rest(q);
    },
    async createPost(p) {
      const [row] = await rest("/posts?select=id,created_at,pseudo,category,content,hugs", { method: "POST", body: p, prefer: "return=representation" });
      row.replies = [];
      return row;
    },
    async createReply(post_id, content) {
      const [row] = await rest("/replies?select=id,created_at,content", { method: "POST", body: { post_id, content }, prefer: "return=representation" });
      return row;
    },
    async hug(id) { return rest("/rpc/give_hug", { method: "POST", body: { p_id: id } }); },
    async report(kind, id) { return rest("/rpc/report_item", { method: "POST", body: { p_kind: kind, p_id: id } }); },
    async listCandles() { return rest("/candles?select=id,created_at,name,message&order=created_at.desc&limit=120"); },
    async countCandles() {
      const res = await fetch(base + "/candles?select=id&limit=1", {
        headers: { apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + cfg.supabaseAnonKey, Prefer: "count=exact" }
      });
      const range = res.headers.get("content-range") || "";
      return Number(range.split("/")[1]) || 0;
    },
    async createCandle(c) {
      const [row] = await rest("/candles?select=id,created_at,name,message", { method: "POST", body: c, prefer: "return=representation" });
      return row;
    }
  };

  // ----- Mode démo : localStorage -----
  const KEY = "lueur-demo-v1";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); }
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function seed() {
    const now = Date.now();
    return {
      posts: [
        { id: uid(), created_at: new Date(now - 36e5).toISOString(), pseudo: "Lune", category: "deuil", content: "Ça fait un an que mon père est parti. Tout le monde a repris sa vie, et moi j'ai l'impression d'être restée figée ce jour-là.", hugs: 12, replies: [{ id: uid(), created_at: new Date(now - 18e5).toISOString(), content: "Tu n'es pas figée, tu l'aimes encore. Un an, c'est tellement peu. 🤍" }] },
        { id: uid(), created_at: new Date(now - 72e5).toISOString(), pseudo: null, category: "rupture", content: "Elle est partie après six ans. Je ne sais plus qui je suis sans elle.", hugs: 7, replies: [] },
        { id: uid(), created_at: new Date(now - 864e5).toISOString(), pseudo: "Sam", category: "solitude", content: "Personne ne m'a parlé de la semaine. Juste écrire ici, ça fait du bien.", hugs: 21, replies: [{ id: uid(), created_at: new Date(now - 8e7).toISOString(), content: "Moi je te lis, Sam. Bonne soirée à toi." }] }
      ],
      candles: [
        { id: uid(), created_at: new Date(now - 5e6).toISOString(), name: "Mamie Jeanne", message: "Tes crêpes du dimanche." },
        { id: uid(), created_at: new Date(now - 9e6).toISOString(), name: "Tous ceux qui luttent ce soir", message: null }
      ]
    };
  }
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 150));

  const local = {
    mode: "demo",
    async listPosts({ category, offset = 0 } = {}) {
      const db = load();
      return delay(db.posts.filter((p) => !category || p.category === category).slice(offset, offset + PAGE));
    },
    async createPost(p) {
      const db = load();
      const row = { id: uid(), created_at: new Date().toISOString(), hugs: 0, replies: [], ...p };
      db.posts.unshift(row); save(db); return delay(row);
    },
    async createReply(post_id, content) {
      const db = load();
      const row = { id: uid(), created_at: new Date().toISOString(), content };
      db.posts.find((p) => p.id === post_id)?.replies.push(row); save(db); return delay(row);
    },
    async hug(id) {
      const db = load(); const p = db.posts.find((x) => x.id === id);
      if (p) p.hugs++; save(db); return delay(p ? p.hugs : 0);
    },
    async report() { return delay(null); },
    async listCandles() { return delay(load().candles); },
    async countCandles() { return delay(load().candles.length); },
    async createCandle(c) {
      const db = load();
      const row = { id: uid(), created_at: new Date().toISOString(), ...c };
      db.candles.unshift(row); save(db); return delay(row);
    }
  };

  window.LUEUR_API = Object.assign(online ? remote : local, { PAGE });
})();
