/* src/Procurement.tsx */
import React from 'react';
import useAuth from './authStore';

const Procurement: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Prokurasi</h1>
      <p className="text-vyapara-secondary">Pemasok dan pembelian</p>
    </div>
  );
};

export default Procurement;