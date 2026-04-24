import React, { useState, useEffect } from 'react';
import JobForm from '../components/JobForm';
import PipelineView from '../components/PipelineView';
import { Building2, List, Briefcase } from 'lucide-react';
import { getJobs } from '../api';

export default function CompanyDashboard() {
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanyJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gray-900 p-3 rounded-xl text-white shadow-md">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hiring Command Center</h1>
            <p className="text-gray-500 mt-1 font-medium">Manage jobs, pipelines, and candidates across your organization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <JobForm onJobCreated={(id) => {
              setSelectedJobId(id);
              fetchCompanyJobs();
            }} />
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <List size={20} /> My Jobs
              </h2>
              {loading ? (
                <p className="text-sm text-gray-500">Loading jobs...</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs created yet.</p>
              ) : (
                <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                  {jobs.map(job => (
                    <li key={job.id}>
                      <button
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedJobId === job.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div>
                          <p className={`font-semibold ${selectedJobId === job.id ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                            {job.title}
                          </p>
                          <p className="text-xs text-gray-500">Capacity: {job.active_capacity}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-3">
            {selectedJobId ? (
              <PipelineView jobId={selectedJobId} />
            ) : (
              <div className="bg-white rounded-3xl p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6 border border-gray-100 shadow-inner">
                  <Briefcase size={36} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Job Selected</h3>
                <p className="text-gray-500 max-w-sm font-medium">Create a new job from the left panel or select an existing one to visualize its pipeline.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
