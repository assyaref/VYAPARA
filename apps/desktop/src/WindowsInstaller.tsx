/* src/WindowsInstaller.tsx */
import React from 'react';
import useAuth from './authStore';

const WindowsInstaller: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Windows Installer</h1>
      <p className="text-vyapara-secondary">Windows installer and release</p>
    </div>
  );
};

export default WindowsInstaller;