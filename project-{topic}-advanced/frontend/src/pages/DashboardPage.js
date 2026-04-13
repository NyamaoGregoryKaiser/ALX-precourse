import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useScraping } from '../hooks/useScraping';
import ScrapeForm from '../components/Scraping/ScrapeForm';
import JobList from '../components/Scraping/JobList';
import ResultList from '../components/Scraping/ResultList';
import './DashboardPage.css';

function DashboardPage() {
  const { user } = useAuth();
  const {
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
  } = useScraping();

  const [activeTab, setActiveTab] = useState('scrape'); // 'scrape', 'jobs', 'results'

  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh jobs and results every 10 seconds to update status
      fetchJobs(pagination.jobs.currentPage, pagination.jobs.limit);
      fetchResults(pagination.results.currentPage, pagination.results.limit);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval); // Clean up on unmount
  }, [fetchJobs, fetchResults, pagination.jobs.currentPage, pagination.jobs.limit, pagination.results.currentPage, pagination.results.limit]);


  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-page">
      <h2>Welcome, {user?.username}!</h2>

      <div className="dashboard-tabs">
        <button className={activeTab === 'scrape' ? 'active' : ''} onClick={() => setActiveTab('scrape')}>
          New Scrape
        </button>
        <button className={activeTab === 'jobs' ? 'active' : ''} onClick={() => setActiveTab('jobs')}>
          My Jobs ({pagination.jobs.total})
        </button>
        <button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>
          My Results ({pagination.results.total})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'scrape' && (
          <ScrapeForm onSubmit={createScrapingJob} />
        )}

        {activeTab === 'jobs' && (
          <JobList
            jobs={jobs}
            pagination={pagination.jobs}
            onPageChange={(page) => fetchJobs(page)}
            onCancelJob={cancelScrapingJob}
          />
        )}

        {activeTab === 'results' && (
          <ResultList
            results={results}
            pagination={pagination.results}
            onPageChange={(page) => fetchResults(page)}
            onDeleteResult={deleteScrapedResult}
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;