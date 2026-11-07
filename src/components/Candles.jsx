import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { api, supabase } from "../lib/api.js";
import { ReportButton } from "./community.jsx";
import { Notice, errText } from "./ui.jsx";

export default function Candles() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.from("candles").select("id, created_at, name, message", { count: "exact" }).order("created_at", { ascending: false }).limit(60)
      .then(({ data, count: c }) => { setItems(data || []); setCount(c || 0); });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const res = await api("candle", { name, message });
      if (res.item) { setItems((l) => [res.item, ...l]); setCount((c) => c + 1); }
      setMsg({ kind: res.status === "rejected" ? "error" : "ok", text: t(`moderation.${res.status}`) });
      if (res.status !== "rejected") { setName(""); setMessage(""); }
    } catch (err) { setMsg({ kind: "error", text: errText(t, err) }); }
    setBusy(false);
  };

  return (
    <section className="mt-14 rounded-ui bg-night p-6 text-white sm:p-10" aria-labelledby="candles-title">
      <h2 id="candles-title" className="mb-2 text-2xl text-white">{t("candles.title")}</h2>
      <p className="mb-5 text-slate-300">{t("candles.lead")}</p>
      <form onSubmit={submit} className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="sr-only" htmlFor="cn">{t("candles.name")}</label>
        <input id="cn" className="field border-white/20 bg-white/5 text-white" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${t("candles.name")} ${t("candles.namePh")}`} />
        <label className="sr-only" htmlFor="cm">{t("candles.msgPh")}</label>
        <input id="cm" className="field border-white/20 bg-white/5 text-white" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("candles.msgPh")} />
        <button className="btn btn-hope" disabled={busy || !name.trim()}>{t("candles.btn")}</button>
      </form>
      <p className="mb-4 text-sm text-slate-300">{t("candles.count", { n: count })}</p>
      {msg && <div className="mb-4 text-ink"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((c) => (
          <li key={c.id} className="relative rounded-ui border border-white/15 px-3 pb-3 pt-10 text-center">
            <span className="absolute left-1/2 top-3 -ml-1.5"><span className="flame" aria-hidden="true" /></span>
            <span className="mx-auto mb-2 block h-8 w-4 rounded-sm bg-[#e6e0d4]" aria-hidden="true" />
            <strong className="block font-head" style={{ overflowWrap: "anywhere" }}>{c.name}</strong>
            {c.message && <span className="block text-xs text-slate-300" style={{ overflowWrap: "anywhere" }}>{c.message}</span>}
            <span className="mt-1 block [&_button]:text-slate-400"><ReportButton type="candle" id={c.id} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
