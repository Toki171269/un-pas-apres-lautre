import { useI18n } from "../lib/i18n.jsx";
import ChatBox, { ChatIntro } from "../components/ChatBox.jsx";
import { PageHead } from "../components/ui.jsx";

export default function Chat() {
  const { t } = useI18n();
  return (
    <div className="wrap max-w-3xl py-10">
      <PageHead title={t("chat.title")} lead={t("chat.lead")}><div className="mt-4"><ChatIntro /></div></PageHead>
      <ChatBox />
    </div>
  );
}
