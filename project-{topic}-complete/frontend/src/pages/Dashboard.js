```javascript
import React, { useState, useEffect } from 'react';
import { jobs, data } from '../api';
import JobCard from '../components/JobCard';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

Modal.setAppElement('#root'); // Important for accessibility

const Dashboard = () => {
    const [jobList, setJobList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentJob, setCurrentJob] = useState(null);
    const [scrapedData, setScrapedData] = useState([]);
    const [jobLogs, setJobLogs] = useState([]);
    const [viewType, setViewType] = useState('data'); // 'data' or 'logs'
    const [isJobFormModalOpen, setIsJobFormModalOpen] = useState(false);
    const [formJob, setFormJob] = useState({
        name: '',
        start_url: '',
        selectors: '', // JSON string
        scrape_type: 'static',
        schedule_cron: '',
        is_active: true,
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const response = await jobs.getAll();
            setJobList(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch jobs.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewData = async (jobId) => {
        setCurrentJob(jobId);
        setViewType('data');
        try {
            const response = await data.getScrapedData(jobId);
            setScrapedData(response.data.data.data);
            setIsModalOpen(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch scraped data.');
            console.error(err);
        }
    };

    const handleViewLogs = async (jobId) => {
        setCurrentJob(jobId);
        setViewType('logs');
        try {
            const response = await data.getJobLogs(jobId);
            setJobLogs(response.data.data);
            setIsModalOpen(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch job logs.');
            console.error(err);
        }
    };

    const handleRunNow = async (jobId) => {
        if (window.confirm('Are you sure you want to run this job immediately?')) {
            try {
                await jobs.runNow(jobId);
                alert('Job enqueued successfully!');
                fetchJobs(); // Refresh job list
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to enqueue job.');
                console.error(err);
            }
        }
    };

    const handleDelete = async (jobId) => {
        if (window.confirm('Are you sure you want to delete this job and all its scraped data?')) {
            try {
                await jobs.delete(jobId);
                alert('Job deleted successfully!');
                fetchJobs(); // Refresh job list
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete job.');
                console.error(err);
            }
        }
    };

    const handleEditJob = (job) => {
        setCurrentJob(job.id);
        setFormJob({
            ...job,
            selectors: JSON.stringify(job.selectors, null, 2), // Pretty print for editing
        });
        setIsJobFormModalOpen(true);
    };

    const handleCreateJob = () => {
        setCurrentJob(null);
        setFormJob({
            name: '',
            start_url: '',
            selectors: JSON.stringify({ itemSelector: '.some-item', title: '.item-title', url: '.item-link[href]' }, null, 2),
            scrape_type: 'static',
            schedule_cron: '0 0 * * *', // Daily at midnight UTC
            is_active: true,
        });
        setIsJobFormModalOpen(true);
    };

    const handleJobFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormJob((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleJobFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formJob,
                selectors: JSON.parse(formJob.selectors), // Parse back to object
            };

            if (currentJob) {
                await jobs.update(currentJob, payload);
                alert('Job updated successfully!');
            } else {
                await jobs.create(payload);
                alert('Job created successfully!');
            }
            fetchJobs();
            setIsJobFormModalOpen(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save job.');
            console.error(err);
        }
    };

    if (loading) return <div className="text-center mt-8">Loading jobs...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Scraping Jobs Dashboard</h1>

            <button
                onClick={handleCreateJob}
                className="bg-purple-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-purple-700 transition-colors duration-200 mb-6"
            >
                Create New Scraping Job
            </button>

            {jobList.length === 0 ? (
                <p className="text-gray-600">No scraping jobs found. Create one to get started!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobList.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            onViewData={handleViewData}
                            onRunNow={handleRunNow}
                            onEdit={handleEditJob}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modal for Scraped Data / Logs */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                contentLabel="Scraped Data / Job Logs"
                className="modal"
                overlayClassName="overlay"
            >
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto my-10 max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 className="text-2xl font-bold">Job Details (ID: {currentJob})</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                    </div>

                    <div className="flex mb-4">
                        <button
                            className={`px-4 py-2 rounded-l-md ${viewType === 'data' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            onClick={() => setViewType('data')}
                        >
                            Scraped Data
                        </button>
                        <button
                            className={`px-4 py-2 rounded-r-md ${viewType === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            onClick={() => setViewType('logs')}
                        >
                            Job Logs
                        </button>
                    </div>

                    <div className="overflow-auto flex-grow">
                        {viewType === 'data' ? (
                            scrapedData.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scraped At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {scrapedData.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline"><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">{JSON.stringify(item.data, null, 2)}</pre>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.scraped_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-600 text-center">No scraped data available for this job.</p>
                            )
                        ) : (
                            jobLogs.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {jobLogs.map((log, index) => (
                                            <tr key={log.id || index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                                                        log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{log.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-600 text-center">No logs available for this job.</p>
                            )
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal for Create/Edit Job Form */}
            <Modal
                isOpen={isJobFormModalOpen}
                onRequestClose={() => setIsJobFormModalOpen(false)}
                contentLabel="Create/Edit Job"
                className="modal"
                overlayClassName="overlay"
            >
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl mx-auto my-10">
                    <h2 className="text-2xl font-bold mb-4">{currentJob ? 'Edit Scraping Job' : 'Create New Scraping Job'}</h2>
                    <form onSubmit={handleJobFormSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Job Name</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                value={formJob.name}
                                onChange={handleJobFormChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="start_url">Start URL</label>
                            <input
                                type="url"
                                name="start_url"
                                id="start_url"
                                value={formJob.start_url}
                                onChange={handleJobFormChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="scrape_type">Scrape Type</label>
                            <select
                                name="scrape_type"
                                id="scrape_type"
                                value={formJob.scrape_type}
                                onChange={handleJobFormChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            >
                                <option value="static">Static (Cheerio)</option>
                                <option value="dynamic">Dynamic (Puppeteer)</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="selectors">Selectors (JSON)</label>
                            <textarea
                                name="selectors"
                                id="selectors"
                                value={formJob.selectors}
                                onChange={handleJobFormChange}
                                rows="8"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline font-mono text-xs"
                                placeholder={`{\n  "itemSelector": ".product-item",\n  "title": ".product-title a",\n  "price": ".product-price",\n  "url": ".product-title a[href]"\n}`}
                                required
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">Provide a JSON object where keys are your desired data fields and values are CSS selectors. Use `[attr]` for attributes.</p>
                            <p className="text-xs text-gray-500">Include `itemSelector` if you want to scrape multiple items on a page.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="schedule_cron">Schedule (Cron string, UTC)</label>
                            <input
                                type="text"
                                name="schedule_cron"
                                id="schedule_cron"
                                value={formJob.schedule_cron}
                                onChange={handleJobFormChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="e.g., 0 0 * * * for daily at midnight UTC"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty for no schedule. Check <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500">crontab.guru</a> for help with cron expressions.</p>
                        </div>
                        <div className="mb-4 flex items-center">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                checked={formJob.is_active}
                                onChange={handleJobFormChange}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="text-gray-700 text-sm font-bold" htmlFor="is_active">Is Active</label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsJobFormModalOpen(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            >
                                {currentJob ? 'Update Job' : 'Create Job'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
```