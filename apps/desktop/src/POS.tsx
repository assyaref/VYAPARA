/* src/POS.tsx */
import React from 'react';
import useAuth from './authStore';

const POS: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">POS Halaman</h1>
      <p className="text-vyapara-secondary">Halaman POS - Belum sepenuhnya diimplementasikan</p>
    </div>
  );
};

export default POS;