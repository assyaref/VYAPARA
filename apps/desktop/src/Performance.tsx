/* src/Performance.tsx */
import React from 'react';
import useAuth from './authStore';

const Performance: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Performance</h1>
      <p className="text-vyapara-secondary">Performance monitoring and optimization</p>
    </div>
  );
};

export default Performance;