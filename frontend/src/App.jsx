import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar      from './components/Navbar';
import HomePage    from './pages/HomePage';
import TripsPage   from './pages/TripsPage';
import PlannerPage from './pages/PlannerPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import useAuth      from './hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
