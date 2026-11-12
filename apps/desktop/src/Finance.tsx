/* src/Finance.tsx */
import React from 'react';
import useAuth from './authStore';

const Finance: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Keuangan & Laporan</h1>
      <p className="text-vyapara-secondary">Laporan keuangan dan raport</p>
    </div>
  );
};

export default Finance;