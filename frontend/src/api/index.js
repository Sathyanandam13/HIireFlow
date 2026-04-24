import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginCompany = async (email, password) => {
  const res = await api.post('/auth/company/login', { email, password });
  return res.data;
};

export const registerCompany = async (name, email, password) => {
  const res = await api.post('/auth/company/register', { name, email, password });
  return res.data;
};

export const loginApplicant = async (email, password) => {
  const res = await api.post('/auth/applicant/login', { email, password });
  return res.data;
};

export const registerApplicant = async (name, email, password) => {
  const res = await api.post('/auth/applicant/register', { name, email, password });
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const getJobs = async () => {
  const res = await api.get('/jobs');
  return res.data;
};

export const getOpenJobs = async () => {
  const res = await api.get('/jobs/open');
  return res.data;
};

export const createJob = async (title, capacity) => {
  const res = await api.post('/jobs', { title, capacity });
  return res.data;
};

export const applyToJob = async (jobId) => {
  const res = await api.post(`/applications/${jobId}/apply`);
  return res.data;
};

export const getPipeline = async (jobId) => {
  const res = await api.get(`/jobs/${jobId}/pipeline`);
  return res.data;
};

export const getJobSummary = async (jobId) => {
  const res = await api.get(`/jobs/${jobId}/summary`);
  return res.data;
};

export const getMyApplications = async () => {
  const res = await api.get('/applications/my');
  return res.data;
};

export const acknowledgePromotion = async (id) => {
  const res = await api.post(`/applications/${id}/acknowledge`);
  return res.data;
};

export const exitPipeline = async (id, type) => {
  const res = await api.post(`/applications/${id}/exit`, { type });
  return res.data;
};

export default api;
