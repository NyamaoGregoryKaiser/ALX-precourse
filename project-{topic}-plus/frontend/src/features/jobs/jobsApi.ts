```tsx
import { apiSlice } from '../../app/api/apiSlice';

// Placeholder types for frontend
interface ScrapingJob {
  id: string;
  name: string;
  targetUrl: string;
  config: any; // Use actual DTO type from backend
  scheduleCron?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'scheduled';
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

interface ScrapingTask {
  id: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ScrapingResult {
  id: string;
  taskId: string;
  jobId: string;
  data: any;
  extractedAt: string;
}

interface CreateScrapingJobDto {
  name: string;
  targetUrl: string;
  config: any;
  scheduleCron?: string | null;
}

interface UpdateScrapingJobDto extends Partial<CreateScrapingJobDto> {}


export const jobsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getScrapingJobs: builder.query<ScrapingJob[], void>({
      query: () => '/scraping-jobs',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'ScrapingJob' as const, id })), { type: 'ScrapingJob', id: 'LIST' }]
          : [{ type: 'ScrapingJob', id: 'LIST' }],
    }),
    getScrapingJobById: builder.query<ScrapingJob, string>({
      query: (id) => `/scraping-jobs/${id}`,
      providesTags: (result, error, id) => [{ type: 'ScrapingJob', id }],
    }),
    createScrapingJob: builder.mutation<ScrapingJob, CreateScrapingJobDto>({
      query: (newJob) => ({
        url: '/scraping-jobs',
        method: 'POST',
        body: newJob,
      }),
      invalidatesTags: [{ type: 'ScrapingJob', id: 'LIST' }],
    }),
    updateScrapingJob: builder.mutation<ScrapingJob, { id: string; data: UpdateScrapingJobDto }>({
      query: ({ id, data }) => ({
        url: `/scraping-jobs/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ScrapingJob', id }, { type: 'ScrapingJob', id: 'LIST' }],
    }),
    deleteScrapingJob: builder.mutation<void, string>({
      query: (id) => ({
        url: `/scraping-jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ScrapingJob', id }, { type: 'ScrapingJob', id: 'LIST' }],
    }),
    runScrapingJobNow: builder.mutation<ScrapingTask, string>({
      query: (id) => ({
        url: `/scraping-jobs/${id}/run`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ScrapingJob' as const, id }, { type: 'ScrapingTask', id: 'LIST' }],
    }),
    getScrapingTasks: builder.query<ScrapingTask[], string>({
      query: (jobId) => `/scraping-jobs/${jobId}/tasks`,
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'ScrapingTask' as const, id })), { type: 'ScrapingTask', id: 'LIST' }]
          : [{ type: 'ScrapingTask', id: 'LIST' }],
    }),
    getScrapingResultsByTaskId: builder.query<ScrapingResult[], string>({
      query: (taskId) => `/scraping-jobs/tasks/${taskId}/results`,
      providesTags: (result, error, taskId) => [{ type: 'ScrapingResult', id: taskId }],
    }),
    getLatestScrapingResultsForJob: builder.query<ScrapingResult[], string>({
      query: (jobId) => `/scraping-jobs/${jobId}/results/latest`,
      providesTags: (result, error, jobId) => [{ type: 'ScrapingResult', id: `LATEST-${jobId}` }],
    }),
  }),
});

export const {
  useGetScrapingJobsQuery,
  useGetScrapingJobByIdQuery,
  useCreateScrapingJobMutation,
  useUpdateScrapingJobMutation,
  useDeleteScrapingJobMutation,
  useRunScrapingJobNowMutation,
  useGetScrapingTasksQuery,
  useGetScrapingResultsByTaskIdQuery,
  useGetLatestScrapingResultsForJobQuery,
} = jobsApi;
```