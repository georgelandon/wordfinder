import { HashRouter, Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/components/layout/ShellLayout";
import { ControllerPage } from "@/pages/ControllerPage";
import { DailyPage } from "@/pages/DailyPage";
import { DisplayPage } from "@/pages/DisplayPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { RoomPage } from "@/pages/RoomPage";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/display/:roomCode" element={<DisplayPage />} />
        <Route path="/" element={<ShellLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="room" element={<RoomPage />} />
          <Route path="controller/:roomCode" element={<ControllerPage />} />
          <Route path="daily" element={<DailyPage />} />
          <Route path="results/:roomCode/:roundId" element={<ResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
