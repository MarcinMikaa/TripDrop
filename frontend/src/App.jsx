import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar      from './components/Navbar';
import HomePage    from './pages/HomePage';
import TripsPage   from './pages/TripsPage';
import PlannerPage from './pages/PlannerPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jwt_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"        element={<HomePage />}    />
        <Route path="login"    element={<LoginPage />}   />
        <Route path="register" element={<RegisterPage />}/>

        <Route path="/trips"   
          element={
            <ProtectedRoute>
              <TripsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/planner" 
          element={
            <ProtectedRoute>
              <PlannerPage />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
