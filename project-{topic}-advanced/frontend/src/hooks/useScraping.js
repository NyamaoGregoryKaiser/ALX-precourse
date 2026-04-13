import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';

export const useScraping = (initialPage = 1, initialLimit = 10) => {
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    jobs: { total: 0, currentPage: initialPage, limit: initialLimit },
    results: { total: 0, currentPage: initialPage, limit: initialLimit },
  });

  const fetchJobs = useCallback(async (page = pagination.jobs.currentPage, limit = pagination.jobs.limit, status = '') => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const res = await api.get(`/jobs`, { params: { limit, offset, status } });
      setJobs(res.data.jobs);
      setPagination(prev => ({
        ...prev,
        jobs: { total: res.data.total, currentPage: page, limit: res.data.limit }
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch jobs.');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.jobs.currentPage, pagination.jobs.limit]);

  const fetchResults = useCallback(async (page = pagination.results.currentPage, limit = pagination.results.limit, jobId = '') => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const res = await api.get(`/results`, { params: { limit, offset, jobId } });
      setResults(res.data.results);
      setPagination(prev => ({
        ...prev,
        results: { total: res.data.total, currentPage: page, limit: res.data.limit }
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results.');
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.results.currentPage, pagination.results.limit]);

  const createScrapingJob = async (url, targetElements) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/scrape', { url, targetElements });
      await fetchJobs(); // Refresh job list after creating a new job
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create job.');
      console.error('Error creating job:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to create job.' };
    } finally {
      setLoading(false);
    }
  };

  const cancelScrapingJob = async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      await api.put(`/jobs/${jobId}/cancel`);
      await fetchJobs(); // Refresh job list
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel job.');
      console.error('Error canceling job:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to cancel job.' };
    } finally {
      setLoading(false);
    }
  };

  const deleteScrapedResult = async (resultId) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/results/${resultId}`);
      await fetchResults(); // Refresh results list
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete result.');
      console.error('Error deleting result:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to delete result.' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchResults();
  }, [fetchJobs, fetchResults]);

  return {
    jobs,
    results,
    loading,
    error,
    pagination,
    fetchJobs,
    fetchResults,
    createScrapingJob,
    cancelScrapingJob,
    deleteScrapedResult,
  };
};