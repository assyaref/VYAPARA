/* src/DocumentServices.tsx */
import React from 'react';
import useAuth from './authStore';

const DocumentServices: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <h1 className="text-3xl font-bold text-vyapara-navy">Layanan Dokumen</h1>
      <p className="text-vyapara-secondary">Fotokopi, Laminating, Binding</p>
    </div>
  );
};

export default DocumentServices;