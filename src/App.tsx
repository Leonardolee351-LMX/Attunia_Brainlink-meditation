import { Navigate, Route, Routes } from "react-router";
import AppFrame from "./components/AppFrame";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import ConsultPage from "./pages/ConsultPage";
import SessionPage from "./pages/SessionPage";
import ScenePage from "./pages/ScenePage";
import ProfilePage from "./pages/ProfilePage";
import SplashPage from "./pages/onboarding/SplashPage";
import CoverPage from "./pages/onboarding/CoverPage";
import DevicePage from "./pages/onboarding/DevicePage";
import CalibrationPage from "./pages/onboarding/CalibrationPage";

/**
 * 路由是确定性的,不读任何标记:
 *   /            Attunia 产品开启页（每次打开先看到）
 *   /onboarding  读懂你的大脑 → device → calibration → /home
 *   校准可跳过,同样落到 /home
 */
export default function App() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/onboarding" element={<CoverPage />} />
        <Route path="/onboarding/device" element={<DevicePage />} />
        <Route path="/onboarding/calibration" element={<CalibrationPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/consult" element={<ConsultPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/scene/:sceneId" element={<ScenePage />} />
        <Route path="/session/:planId" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppFrame>
  );
}
