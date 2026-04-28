import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar      from './components/Navbar';
import HomePage    from './pages/HomePage';
import TripsPage   from './pages/TripsPage';
import PlannerPage from './pages/PlannerPage';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"        element={<HomePage />}    />
        <Route path="/trips"   element={<TripsPage />}   />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
