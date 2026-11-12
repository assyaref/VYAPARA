/* src/NextDashboard.tsx */
import React from 'react';
import useAuth from './authStore';

const NextDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Owner Dashboard (Next.js)</h1>
      <p className="text-vyapara-secondary">Owner dashboard berbasis Next.js</p>
    </div>
  );
};

export default NextDashboard;