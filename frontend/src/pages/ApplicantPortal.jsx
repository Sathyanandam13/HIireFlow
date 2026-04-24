import React, { useState, useEffect } from 'react';
import { getOpenJobs, applyToJob, getMyApplications, acknowledgePromotion } from '../api';
import { UserCircle, Briefcase, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ApplicantPortal() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [jobsData, appsData] = await Promise.all([
        getOpenJobs(),
        getMyApplications()
      ]);
      setJobs(jobsData);
      setApplications(appsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async (jobId) => {
    try {
      await applyToJob(jobId);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply');
    }
  };

  const handleAcknowledge = async (appId) => {
    try {
      await acknowledgePromotion(appId);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to acknowledge');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-md">
            <UserCircle size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome, {user?.name}</h1>
            <p className="text-gray-500 mt-1 font-medium">Manage your applications and discover new roles.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Applications */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={20} /> My Applications
            </h2>
            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 text-gray-500">
                You haven't applied to any jobs yet.
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => (
                  <div key={app.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{app.job_title}</h3>
                      <p className="text-sm text-gray-500">{app.company_name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${app.status === 'active' ? 'bg-green-100 text-green-800' : 
                            app.status === 'pending_ack' ? 'bg-yellow-100 text-yellow-800' : 
                            app.status === 'waitlisted' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}
                        `}>
                          {app.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {app.status === 'waitlisted' && (
                          <span className="text-sm font-medium text-gray-600">
                            Queue Position: #{app.queue_position}
                          </span>
                        )}
                      </div>
                    </div>
                    {app.status === 'pending_ack' && (
                      <button
                        onClick={() => handleAcknowledge(app.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors"
                      >
                        Acknowledge Offer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Jobs */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} /> Open Roles
            </h2>
            <div className="space-y-4">
              {jobs.map(job => {
                const hasApplied = applications.some(a => a.job_id === job.id);
                return (
                  <div key={job.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-500">{job.company_name}</p>
                    </div>
                    <button
                      disabled={hasApplied}
                      onClick={() => handleApply(job.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors ${
                        hasApplied 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {hasApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
