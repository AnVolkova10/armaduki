import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PeoplePage } from './pages/PeoplePage';
import { MatchPage } from './pages/MatchPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PeoplePage />} />
          <Route path="match" element={<MatchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
