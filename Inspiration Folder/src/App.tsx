import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CalendarView } from './pages/CalendarView';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalendarView />} />
        {/* Support the old paths as well to not break existing links during dev */}
        <Route path="/community-calendar" element={<CalendarView />} />
        <Route path="/community-calendar/event/:id" element={<CalendarView />} />
        
        <Route path="/login" element={<Login />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

