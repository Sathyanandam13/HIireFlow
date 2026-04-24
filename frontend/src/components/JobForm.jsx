import React, { useState } from 'react';
import { createJob } from '../api';
import { Briefcase, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function JobForm({ onJobCreated }) {
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!title || !capacity || isNaN(capacity) || Number(capacity) <= 0) {
        throw new Error('Please provide a valid title and capacity.');
      }
      const job = await createJob(title, Number(capacity));
      setSuccess(`Job created successfully! Job ID: ${job.id}`);
      setTitle('');
      setCapacity('');
      if (onJobCreated) onJobCreated(job.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create job.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
          <Briefcase size={24} />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Create New Job</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="e.g. Senior Frontend Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Active Capacity</label>
          <input
            type="number"
            min="1"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="e.g. 5"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm mt-2 bg-green-50 p-3 rounded-lg border border-green-100">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg transition-all hover:bg-gray-800 focus:ring-4 focus:ring-gray-900/10 active:scale-[0.98]",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          {isLoading ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </div>
  );
}
