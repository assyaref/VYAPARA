/* src/OfflineSync.tsx */
import React from 'react';
import useAuth from './authStore';

const OfflineSync: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Offline Sync</h1>
      <p className="text-vyapara-secondary">Offline-first synchronization engine</p>
    </div>
  );
};

export default OfflineSync;