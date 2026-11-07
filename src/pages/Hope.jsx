import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { IMG } from "../lib/data.js";
import { PageHead } from "../components/ui.jsx";
import { PostList, usePosts } from "./Community.jsx";

export default function Hope() {
  const { t } = useI18n();
  const feed = usePosts({ kind: "hope" });
  return (
    <div className="wrap py-10">
      <div className="mb-8 grid items-center gap-6 md:grid-cols-[1fr_320px]">
        <PageHead title={t("hope.title")} lead={t("hope.lead")}>
          <Link to="/deposer?type=hope" className="btn btn-hope mt-4">{t("hope.share")}</Link>
        </PageHead>
        <div className="photo hidden h-48 rounded-ui bg-cover bg-center md:block" style={{ backgroundImage: `url(${IMG.espoir})` }} />
      </div>
      <PostList {...feed} empty={t("hope.empty")} />
    </div>
  );
}
