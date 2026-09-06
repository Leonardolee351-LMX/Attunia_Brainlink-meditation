import { Navigate, Route, Routes } from "react-router";
import AppFrame from "./components/AppFrame";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import ConsultPage from "./pages/ConsultPage";
import SessionPage from "./pages/SessionPage";
import ScenePage from "./pages/ScenePage";
import ProfilePage from "./pages/ProfilePage";
import SplashPage from "./pages/onboarding/SplashPage";
import PurposePage from "./pages/onboarding/PurposePage";
import CoverPage from "./pages/onboarding/CoverPage";
import DevicePage from "./pages/onboarding/DevicePage";
import CalibrationPage from "./pages/onboarding/CalibrationPage";

/**
 * 路由是确定性的,不读任何标记:
 *   /            Attunia 开屏
 *   /purpose     四页产品说明书（是什么 / 帮什么 / 怎么用 / 边界）
 *   /onboarding  设备先认识你 → device → calibration → /home
 *   /home        对话 Home
 *   /explore     探索训练计划
 */
export default function App() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/purpose" element={<PurposePage />} />
        <Route path="/onboarding/purpose" element={<Navigate to="/purpose" replace />} />
        <Route path="/onboarding" element={<CoverPage />} />
        <Route path="/onboarding/device" element={<DevicePage />} />
        <Route path="/onboarding/calibration" element={<CalibrationPage />} />
        <Route path="/home" element={<ChatPage />} />
        <Route path="/explore" element={<Home />} />
        <Route path="/chat" element={<Navigate to="/home" replace />} />
        <Route path="/consult" element={<ConsultPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/scene/:sceneId" element={<ScenePage />} />
        <Route path="/session/:planId" element={<SessionPage />} />
        {/* 未知路径回 Home，避免误打回开屏造成循环刷新 */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppFrame>
  );
}
