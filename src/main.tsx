import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Announcer } from "@/ui/components/Announcer";
import { IllustrationDialogProvider } from "@/ui/components/IllustrationDialog";
import { Page } from "@/components/Chrome";
import { Loading, NotFound } from "@/components/LoadState";
import { CatalogScreen } from "@/screens/CatalogScreen";
import { CourseScreen } from "@/screens/CourseScreen";
import { LandingScreen } from "@/screens/LandingScreen";
import { LessonScreen } from "@/screens/LessonScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { illustrationDialogLabels } from "@/strings";
import "./index.css";

// The homestead's scene and drawings are loaded when it is first opened.
const HomesteadScreen = lazy(() => import("@/screens/HomesteadScreen"));

// Routes are plain paths under the site's base path. The host serves the
// same page for every one of them (see the 404.html copy in vite.config.ts).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Announcer />
    <IllustrationDialogProvider labels={illustrationDialogLabels}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/courses" element={<CatalogScreen />} />
          <Route path="/course/:slug" element={<CourseScreen />} />
          <Route path="/course/:slug/lesson/:lesson" element={<LessonScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route
            path="/homestead"
            element={
              <Suspense
                fallback={
                  <Page focusKey="homestead-loading" busy>
                    <Loading />
                  </Page>
                }
              >
                <HomesteadScreen />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Page focusKey="not-found">
                <NotFound />
              </Page>
            }
          />
        </Routes>
      </BrowserRouter>
    </IllustrationDialogProvider>
  </StrictMode>,
);
