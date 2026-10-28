import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import "./installPrompt.ts"; 
import PwaUpdater from "./components/PwaUpdater";
import Toaster from "./components/Toaster";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import Register from './pages/Register';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* pública */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protegida */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaUpdater/>
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>
);