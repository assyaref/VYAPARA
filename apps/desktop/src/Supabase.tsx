/* src/Supabase.tsx */
import React from 'react';
import useAuth from './authStore';

const Supabase: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Supabase Cloud</h1>
      <p className="text-vyapara-secondary">Foundation cloud synchronization</p>
    </div>
  );
};

export default Supabase;