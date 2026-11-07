// Tableau de bord de modération (réservé aux comptes listés dans la table admins).
// Interface en français uniquement : elle ne concerne que l'équipe de modération.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/api.js";
import { Notice, PageHead } from "../components/ui.jsx";

const PRIO = ["Normal", "À vérifier", "Important", "Urgent"];
const PRIO_CLS = ["border-line", "border-mist-b", "border-hope", "border-danger"];
const TABLES = { post: "posts", reply: "replies", encouragement: "encouragements", candle: "candles" };
const TEXT = (type, row) => (type === "post" ? `${row.title}\n\n${row.body}` : type === "candle" ? `${row.name}${row.message ? " — " + row.message : ""}` : row.body);
const fmt = (d) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function Admin() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("is_admin").then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (!session) return <Login />;
  return (
    <div className="wrap py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageHead title="Modération" lead={`Connecté : ${session.user.email}`} />
        <button className="btn btn-line" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div>
      {isAdmin === false && <Notice kind="error">Ce compte n'a pas les droits de modération. Ajoute son identifiant dans la table <code>admins</code> (voir README).</Notice>}
      {isAdmin && <Dashboard />}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError("Connexion refusée. Vérifie l'email et le mot de passe.");
    setBusy(false);
  };
  return (
    <div className="wrap max-w-md py-12">
      <PageHead title="Espace modération" lead="Réservé à l'équipe. Les visiteurs n'ont jamais besoin de compte." />
      <form onSubmit={submit} className="card grid gap-3">
        <label className="label" htmlFor="ae">Email</label>
        <input id="ae" type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="label" htmlFor="ap">Mot de passe</label>
        <input id="ap" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-danger">{error}</p>}
        <button className="btn btn-hope" disabled={busy}>Se connecter</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [tab, setTab] = useState("queue");
  const TABS = [["queue", "À traiter"], ["reports", "Signalements"], ["posts", "Publications"], ["log", "Journal"], ["stats", "Statistiques"]];
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} className="chip" onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === "queue" && <Queue />}
      {tab === "reports" && <Reports />}
      {tab === "posts" && <AllPosts />}
      {tab === "log" && <Log />}
      {tab === "stats" && <Stats />}
    </>
  );
}

async function moderate(type, id, action, note) {
  const { error } = await supabase.rpc("admin_moderate", { p_type: type, p_id: id, p_action: action, p_note: note || null });
  if (error) alert("Erreur : " + error.message);
  return !error;
}

function Actions({ type, id, status, onDone }) {
  const act = async (a) => {
    if (a === "delete" && !confirm("Supprimer définitivement ?")) return;
    if (await moderate(type, id, a)) onDone();
  };
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "visible" && <button className="btn btn-hope btn-sm" onClick={() => act("approve")}>Approuver</button>}
      {status === "visible" && <button className="btn btn-line btn-sm" onClick={() => act("hide")}>Masquer</button>}
      {status !== "rejected" && <button className="btn btn-line btn-sm" onClick={() => act("reject")}>Refuser</button>}
      <button className="btn btn-line btn-sm border-danger text-danger" onClick={() => act("delete")}>Supprimer</button>
    </div>
  );
}

function Item({ type, row, onDone, extra }) {
  const crisis = (row.flag_reason || "").includes("crisis");
  return (
    <li className={`card list-none border-l-4 ${PRIO_CLS[row.priority || 0]}`}>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <strong className="text-ink">{{ post: "Histoire", reply: "Réponse", encouragement: "Encouragement", candle: "Bougie" }[type]}{row.kind === "hope" ? " d'espoir" : ""}</strong>
        <span>{PRIO[row.priority || 0]}</span><span>{row.status}</span><span>{fmt(row.created_at)}</span>
        {row.pseudo && <span>{row.pseudo}</span>}
        {row.flag_reason && <span>Motifs : {row.flag_reason}</span>}
        {row.report_count > 0 && <span>{row.report_count} signalement(s)</span>}
        {type === "post" && row.status === "visible" && <Link to={`/histoire/${row.id}`}>voir</Link>}
      </div>
      {crisis && <p className="mb-2 rounded-ui bg-hope-soft px-3 py-2 text-sm">Possible situation de crise. L'auteur est anonyme et ne peut pas être contacté : si tu publies, une réponse bienveillante orientant vers les lignes d'écoute peut aider.</p>}
      <p className="mb-3 whitespace-pre-line" style={{ overflowWrap: "anywhere" }}>{TEXT(type, row)}</p>
      {extra}
      <Actions type={type} id={row.id} status={row.status} onDone={onDone} />
    </li>
  );
}

function Queue() {
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const out = [];
    for (const [type, table] of Object.entries(TABLES)) {
      const { data } = await supabase.from(table).select("*").eq("status", "pending").limit(200);
      (data || []).forEach((row) => out.push({ type, row }));
    }
    out.sort((a, b) => (b.row.priority || 0) - (a.row.priority || 0) || new Date(a.row.created_at) - new Date(b.row.created_at));
    setItems(out);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!items) return <p className="text-muted">Chargement…</p>;
  if (!items.length) return <Notice kind="ok">Rien en attente. Merci pour ton travail.</Notice>;
  return <ul className="grid gap-3">{items.map(({ type, row }) => <Item key={row.id} type={type} row={row} onDone={load} />)}</ul>;
}

const REASONS = { harcelement: "Insultes ou harcèlement", menaces: "Menaces", haine: "Discours haineux", manipulation: "Manipulation", donnees: "Données personnelles", spam: "Spam", conseils: "Conseils dangereux", autodestruction: "Automutilation / suicide", inapproprie: "Inapproprié" };
function Reports() {
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("reports").select("*").eq("status", "open").order("priority", { ascending: false }).order("created_at").limit(200);
    const withTargets = await Promise.all((data || []).map(async (r) => {
      const { data: target } = await supabase.from(TABLES[r.target_type]).select("*").eq("id", r.target_id).maybeSingle();
      return { report: r, target };
    }));
    setItems(withTargets);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!items) return <p className="text-muted">Chargement…</p>;
  if (!items.length) return <Notice kind="ok">Aucun signalement ouvert.</Notice>;
  return (
    <ul className="grid gap-3">
      {items.map(({ report: r, target }) => target ? (
        <Item key={r.id} type={r.target_type} row={{ ...target, priority: Math.max(target.priority || 0, r.priority) }} onDone={load}
          extra={<p className="mb-3 text-sm"><strong>Signalé pour :</strong> {REASONS[r.reason] || r.reason}{r.details ? ` — « ${r.details} »` : ""} · {fmt(r.created_at)}
            <button className="ml-3 underline" onClick={async () => { if (await moderate("report", r.id, "resolve")) load(); }}>Classer sans suite</button></p>} />
      ) : (
        <li key={r.id} className="card list-none text-sm text-muted">Contenu déjà supprimé. <button className="underline" onClick={async () => { if (await moderate("report", r.id, "resolve")) load(); }}>Classer</button></li>
      ))}
    </ul>
  );
}

function AllPosts() {
  const [status, setStatus] = useState("visible");
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("posts").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100);
    setItems(data || []);
  }, [status]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <div className="mb-4 flex gap-2">{["visible", "pending", "hidden", "rejected"].map((s) => <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}</div>
      {!items ? <p className="text-muted">Chargement…</p> : !items.length ? <Notice>Aucune publication.</Notice>
        : <ul className="grid gap-3">{items.map((row) => <Item key={row.id} type="post" row={row} onDone={load} />)}</ul>}
    </>
  );
}

function Log() {
  const [items, setItems] = useState(null);
  useEffect(() => { supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setItems(data || [])); }, []);
  if (!items) return <p className="text-muted">Chargement…</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead><tr className="border-b border-line"><th className="py-2">Date</th><th>Action</th><th>Type</th><th>Contenu</th><th>Note</th></tr></thead>
      <tbody>{items.map((l) => <tr key={l.id} className="border-b border-line"><td className="py-2">{fmt(l.created_at)}</td><td>{l.action}</td><td>{l.target_type}</td><td className="font-mono text-xs">{l.target_id?.slice(0, 8)}</td><td>{l.note}</td></tr>)}</tbody>
    </table>
  );
}

function Stats() {
  const [s, setS] = useState(null);
  useEffect(() => { supabase.rpc("admin_stats").then(({ data }) => setS(data)); }, []);
  if (!s) return <p className="text-muted">Chargement…</p>;
  const c = s.counters || {};
  const today = new Date().toISOString().slice(0, 10);
  const tiles = [
    ["Histoires publiées", s.posts], ["En attente", s.posts_pending], ["Réponses de soutien", s.replies], ["Encouragements", s.encouragements],
    ["Signalements ouverts", s.reports_open], ["Signalements au total", s.reports_total], ["Délai moyen de traitement (h)", s.avg_moderation_hours ?? "—"],
    ["Conversations IA", c.chat_conversations || 0], ["Messages IA", c.chat_messages || 0], ["Messages IA aujourd'hui", c[`chat_day:${today}`] || 0],
  ];
  const views = Object.entries(c).filter(([k]) => /^(resource|exercise|page):/.test(k)).sort((a, b) => b[1] - a[1]);
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map(([l, v]) => <div key={l} className="card"><div className="text-sm text-muted">{l}</div><div className="font-head text-2xl font-extrabold">{v}</div></div>)}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card"><h2 className="mb-3 text-lg">Publications par situation</h2>
          <ul className="grid gap-1 text-sm">{Object.entries(s.by_category || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></li>)}</ul></div>
        <div className="card"><h2 className="mb-3 text-lg">Consultations des ressources</h2>
          <ul className="grid gap-1 text-sm">{views.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></li>)}</ul></div>
      </div>
      <p className="text-sm text-muted">Totaux anonymes uniquement : aucune donnée ne permet de suivre une personne.</p>
    </div>
  );
}
