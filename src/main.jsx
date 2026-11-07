import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./styles.css";
import { I18nProvider } from "./lib/i18n.jsx";
import { AppStateProvider } from "./lib/state.jsx";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Community from "./pages/Community.jsx";
import PostPage from "./pages/PostPage.jsx";
import Publish from "./pages/Publish.jsx";
import Hope from "./pages/Hope.jsx";
import HelpOthers from "./pages/HelpOthers.jsx";
import Resources, { Breath, Consult, Directory, Ground, Guide, HelpNow, Letter } from "./pages/Resources.jsx";
import { Charter, Manage, NotFound, Privacy } from "./pages/Info.jsx";
const Admin = lazy(() => import("./pages/Admin.jsx")); // chargé seulement pour la modération

// HashRouter : compatible avec GitHub Pages (pas de configuration serveur)
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <AppStateProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="ia" element={<Chat />} />
              <Route path="communaute" element={<Community />} />
              <Route path="communaute/espace/:space" element={<Community />} />
              <Route path="histoire/:id" element={<PostPage />} />
              <Route path="deposer" element={<Publish />} />
              <Route path="espoir" element={<Hope />} />
              <Route path="aider" element={<HelpOthers />} />
              <Route path="ressources" element={<Resources />} />
              <Route path="ressources/guide/:id" element={<Guide />} />
              <Route path="ressources/respirer" element={<Breath />} />
              <Route path="ressources/ancrage" element={<Ground />} />
              <Route path="ressources/lettre" element={<Letter />} />
              <Route path="ressources/consultation" element={<Consult />} />
              <Route path="ressources/annuaire" element={<Directory />} />
              <Route path="aide-maintenant" element={<HelpNow />} />
              <Route path="gerer" element={<Manage />} />
              <Route path="charte" element={<Charter />} />
              <Route path="confidentialite" element={<Privacy />} />
              <Route path="admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </I18nProvider>
  </StrictMode>,
);
