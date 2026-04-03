```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export const apiSlice = createApi({
  reducerPath: 'api', // The name of the reducer in the Redux store
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['ScrapingJob', 'ScrapingTask', 'ScrapingResult'], // Define tags for invalidation
  endpoints: (builder) => ({
    // This is where you'll define your API endpoints later
    // e.g., getJobs: builder.query<Job[], void>({ query: () => '/scraping-jobs' })
  }),
});
```