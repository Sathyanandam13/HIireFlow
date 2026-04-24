import React, { useEffect, useState } from 'react';
import { getPipeline, exitPipeline, applyToJob } from '../api';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StatusBadge = ({ status }) => {
  const styles = {
    'pending_ack': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'active': 'bg-green-100 text-green-800 border-green-200',
    'waitlisted': 'bg-blue-100 text-blue-800 border-blue-200',
    'rejected': 'bg-red-100 text-red-800 border-red-200',
    'hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'withdrawn': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    'pending_ack': 'Pending Ack',
    'active': 'Active',
    'waitlisted': 'Waitlist',
    'rejected': 'Rejected',
    'hired': 'Hired',
    'withdrawn': 'Withdrawn',
  };

  return (
    <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full border", styles[status] || 'bg-gray-100 text-gray-800')}>
      {labels[status] || status}
    </span>
  );
};

const Countdown = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!deadline) return;
    
    const update = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    };

    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [deadline]);

  if (!deadline) return null;
  
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
      <Clock size={12} />
      {timeLeft}
    </div>
  );
};

export default function PipelineView({ jobId }) {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPipeline = async (showRefresh = false) => {
    if (!jobId) return;
    if (showRefresh) setIsRefreshing(true);
    
    try {
      const data = await getPipeline(jobId);
      setPipeline(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
      if (showRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(() => fetchPipeline(false), 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  const handleAction = async (id, type) => {
    try {
      await exitPipeline(id, type);
      fetchPipeline(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };


  if (!jobId) return null;

  if (loading && !pipeline) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 animate-pulse h-96 flex items-center justify-center text-gray-400">
        Loading pipeline data...
      </div>
    );
  }

  const { job, metrics, applications } = pipeline || {};
  const activeOrPending = applications?.filter(a => ['active', 'pending_ack'].includes(a.status)) || [];
  const waitlisted = applications?.filter(a => a.status === 'waitlisted').sort((a, b) => Number(a.waitlist_position) - Number(b.waitlist_position)) || [];
  const completed = applications?.filter(a => ['rejected', 'hired', 'withdrawn'].includes(a.status)) || [];
  
  const capacity = job?.capacity || 0;
  const slotsUsed = metrics?.active + metrics?.pending_ack || 0;
  const availableSlots = Math.max(0, capacity - slotsUsed);
  const usagePercent = capacity > 0 ? Math.min(100, (slotsUsed / capacity) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gray-900 px-6 py-5 border-b border-gray-800 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 border border-blue-500/30">
              <BarChart size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{job?.title || 'Job Pipeline'}</h2>
              <p className="text-sm text-gray-400 font-medium">Job ID: <span className="font-mono text-xs">{jobId}</span></p>
            </div>
          </div>
          <button 
            onClick={() => fetchPipeline(true)} 
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
            title="Refresh"
          >
            <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5 font-medium">
            <span className="text-gray-300">Capacity Usage</span>
            <span className="text-white">{slotsUsed} / {capacity} slots</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 border border-gray-700 overflow-hidden">
            <div 
              className={cn(
                "h-2.5 rounded-full transition-all duration-500",
                usagePercent >= 100 ? "bg-red-500" : usagePercent > 75 ? "bg-yellow-500" : "bg-green-500"
              )} 
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
        </div>
      </div>


      {error && (
        <div className="m-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-2 font-medium">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50/50 border-b border-gray-100">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Applicants</div>
          <div className="text-2xl font-bold text-gray-900">{metrics?.total || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -z-10"></div>
          <div className="text-green-700 text-xs font-semibold uppercase tracking-wider mb-1">Active / Pending</div>
          <div className="text-2xl font-bold text-green-700">{slotsUsed}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
          <div className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">Waitlisted</div>
          <div className="text-2xl font-bold text-blue-700">{metrics?.waitlisted || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Available Slots</div>
          <div className="text-2xl font-bold text-gray-900">{availableSlots}</div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Active & Pending Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            Active Pipeline ({activeOrPending.length})
          </h3>
          <div className="grid gap-3">
            {activeOrPending.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No active or pending applicants occupying slots.
              </div>
            ) : (
              activeOrPending.map(app => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg border border-gray-200">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">{app.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{app.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-4 sm:justify-end">
                    {app.status === 'pending_ack' && app.ack_deadline && (
                      <Countdown deadline={app.ack_deadline} />
                    )}
                    <StatusBadge status={app.status} />
                    <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-100">
                      <button onClick={() => handleAction(app.id, 'hired')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors" title="Hire Candidate">
                        <CheckCircle size={16} /> Hire
                      </button>
                      <button onClick={() => handleAction(app.id, 'rejected')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors" title="Reject Candidate">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Waitlist Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
            Waitlist Queue ({waitlisted.length})
          </h3>
          <div className="grid gap-3">
            {waitlisted.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Waitlist is currently empty.
              </div>
            ) : (
              waitlisted.map((app, index) => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow gap-4 opacity-90">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{app.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{app.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {app.decay_penalty > 0 && (
                      <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-orange-700 bg-orange-100 rounded-md border border-orange-200 uppercase">
                        {app.decay_penalty} Penalty
                      </span>
                    )}
                    <StatusBadge status={app.status} />
                    <button onClick={() => handleAction(app.id, 'rejected')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject from Waitlist">
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Section */}
        {completed.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
              Completed ({completed.length})
            </h3>
            <div className="grid gap-2">
              {completed.slice(0, 10).map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="text-sm font-medium text-gray-700">{app.name}</div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
              {completed.length > 10 && (
                <div className="text-xs text-center text-gray-500 mt-2 font-medium">
                  + {completed.length - 10} more completed applications
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
