import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MatchEditorHost, type MatchRouteState } from './components/MatchEditor';
import { MatchesPage } from './pages/MatchesPage';
import { PlayersPage } from './pages/PlayersPage';
import './index.css';

/**
 * Players and Match are one screen since 19/11/2026; the matches got their own in Sprint 9. A match
 * opens over the screen it came from (its `background`), so going back closes it and leaves that
 * screen as it was: the picks, the result, the scroll.
 */
function AppRoutes() {
  const location = useLocation();
  const background = (location.state as MatchRouteState | null)?.background;

  return (
    <>
      <Routes location={background ?? location}>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlayersPage />} />
          <Route path="matches/*" element={<MatchesPage />} />
          {/* /match and any old link land on the players. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <MatchEditorHost />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
