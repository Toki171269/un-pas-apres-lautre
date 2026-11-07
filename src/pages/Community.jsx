import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { POST_COLS, supabase } from "../lib/api.js";
import { IMG, SPACES } from "../lib/data.js";
import { CategorySelect, PostCard } from "../components/community.jsx";
import { PageHead } from "../components/ui.jsx";
import Candles from "../components/Candles.jsx";

const PAGE = 12;
const MODES = ["recent", "unanswered", "replied", "hope"];

export function usePosts({ mode = "recent", category = "", space = "", kind = "", ascending = false }) {
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState("loading");
  const [hasMore, setHasMore] = useState(false);

  const load = async (offset = 0) => {
    setState("loading");
    let q = supabase.from("posts").select(POST_COLS);
    if (category) q = q.eq("category", category);
    if (space) q = q.eq("space", space);
    if (kind || mode === "hope") q = q.eq("kind", kind || "hope");
    if (mode === "unanswered") q = q.eq("reply_count", 0).eq("allow_replies", true);
    if (mode === "replied") q = q.gt("reply_count", 0);
    const { data, error } = await q.order("created_at", { ascending }).range(offset, offset + PAGE - 1);
    if (error) { setState("error"); return; }
    setPosts((p) => (offset ? [...p, ...data] : data));
    setHasMore(data.length === PAGE);
    setState("ready");
  };
  useEffect(() => { load(0); }, [mode, category, space, kind, ascending]); // eslint-disable-line react-hooks/exhaustive-deps
  return { posts, state, hasMore, more: () => load(posts.length), reload: () => load(0) };
}

export function PostList({ posts, state, hasMore, more, reload, empty }) {
  const { t } = useI18n();
  return (
    <>
      {state === "error" && <p className="text-danger">{t("errors.server_error")} <button className="underline" onClick={reload}>{t("common.retry")}</button></p>}
      {state !== "error" && !posts.length && state === "ready" && <p className="card text-center text-muted">{empty}</p>}
      <div className="grid gap-4 md:grid-cols-2">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      {state === "loading" && <p className="mt-4 text-muted">{t("common.loading")}</p>}
      {hasMore && state === "ready" && <div className="mt-6 text-center"><button className="btn btn-line" onClick={more}>{t("common.more")}</button></div>}
    </>
  );
}

export default function Community() {
  const { t } = useI18n();
  const { space = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get("mode")) ? params.get("mode") : "recent";
  const category = params.get("cat") || "";
  const feed = usePosts({ mode, category, space });
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  return (
    <div className="wrap py-10">
      {space ? (
        <div className="mb-8 grid items-center gap-6 md:grid-cols-[1fr_320px]">
          <PageHead eyebrow={t("community.spaces")} title={t(`space.${space}.name`)} lead={t(`space.${space}.desc`)}>
            <Link to="/communaute" className="mt-3 inline-block font-head font-bold">{t("community.allSpaces")}</Link>
          </PageHead>
          <div className="photo hidden h-44 rounded-ui bg-cover bg-center md:block" style={{ backgroundImage: `url(${IMG[space]})` }} />
        </div>
      ) : (
        <PageHead title={t("community.title")} lead={t("community.lead")} />
      )}

      {!space && (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label={t("community.spaces")}>
          {SPACES.map((s) => <Link key={s} to={s === "espoir" ? "/espoir" : `/communaute/espace/${s}`} className="chip no-underline">{t(`space.${s}.name`)}</Link>)}
        </nav>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-2" role="group">
          {MODES.map((m) => <button key={m} className="chip" aria-pressed={mode === m} onClick={() => set("mode", m === "recent" ? "" : m)}>{t(`community.modes.${m}`)}</button>)}
        </div>
        <div className="min-w-60">
          <label htmlFor="cat" className="label">{t("community.filter")}</label>
          <CategorySelect id="cat" value={category} onChange={(v) => set("cat", v)} withAll allLabel={t("community.allCats")} />
        </div>
        <Link to={space ? `/deposer?espace=${space}` : "/deposer"} className="btn btn-hope ml-auto">{t("community.write")}</Link>
      </div>

      <PostList {...feed} empty={t("community.empty")} />
      {space === "deuil" && <Candles />}
    </div>
  );
}
