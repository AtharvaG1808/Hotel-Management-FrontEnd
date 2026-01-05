import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TravelPackages from './pages/TravelPackages';
import AddTravelPackages from './pages/AddTravelPackages';
import AddHotelPackage from './pages/AddHotelPackage';
import HotelDetails from './pages/HotelDetails';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // Keep in sync if token changes in other tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/home"
          element={token ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/hotels"
          element={token ? <AddHotelPackage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/packages"
          element={token ? <TravelPackages /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/addTravelPackage"
          element={token ? <AddTravelPackages /> : <Navigate to="/login" replace />}
        />
        <Route path="/hotel/:id" element={token ? <HotelDetails /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
