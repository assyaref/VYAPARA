/* src/PrintBanner.tsx */
import React from 'react';
import useAuth from './authStore';

const PrintBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Print & Banner</h1>
      <p className="text-vyapara-secondary">Print workflow and banner printing</p>
    </div>
  );
};

export default PrintBanner;