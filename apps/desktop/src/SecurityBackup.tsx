/* src/SecurityBackup.tsx */
import React from 'react';
import useAuth from './authStore';

const SecurityBackup: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Security & Backup</h1>
      <p className="text-vyapara-secondary">Security, backup, restore, and performance</p>
    </div>
  );
};

export default SecurityBackup;