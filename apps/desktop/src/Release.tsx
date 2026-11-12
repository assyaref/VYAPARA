/* src/Release.tsx */
import React from 'react';
import useAuth from './authStore';

const Release: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Release & Installer</h1>
      <p className="text-vyapara-secondary">Windows installer and release preparation</p>
    </div>
  );
};

export default Release;