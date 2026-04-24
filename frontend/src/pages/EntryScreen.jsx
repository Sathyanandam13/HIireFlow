import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EntryScreen() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to={`/${user.role}/dashboard`} />;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
            Welcome to HireFlow
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Who are you?
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            to="/auth/company"
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all"
          >
            I am a Company
          </Link>
          <Link
            to="/auth/applicant"
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-xl text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow hover:shadow-md transition-all"
          >
            I am an Applicant
          </Link>
        </div>
      </div>
    </div>
  );
}
