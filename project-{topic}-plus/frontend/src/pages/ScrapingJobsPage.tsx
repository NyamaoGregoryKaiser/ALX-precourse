```tsx
import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Spacer,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useGetScrapingJobsQuery } from '../features/jobs/jobsApi';
import JobCard from '../components/JobCard';

const ScrapingJobsPage: React.FC = () => {
  const { data: jobs, isLoading, isError, error } = useGetScrapingJobsQuery();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="70vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (isError) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading jobs: {(error as any)?.data?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box maxW="container.xl" mx="auto" py={5}>
      <Flex align="center" mb={6}>
        <Heading as="h1" size="xl">
          My Scraping Jobs
        </Heading>
        <Spacer />
        <RouterLink to="/jobs/create">
          <Button colorScheme="brand">Create New Job</Button>
        </RouterLink>
      </Flex>

      {jobs?.length === 0 ? (
        <Box textAlign="center" mt={10} p={5} borderWidth={1} borderRadius="lg">
          <Text fontSize="lg" mb={3}>
            You haven't created any scraping jobs yet.
          </Text>
          <RouterLink to="/jobs/create">
            <ChakraLink color="brand.700" fontWeight="bold">
              Start by creating your first job!
            </ChakraLink>
          </RouterLink>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {jobs?.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default ScrapingJobsPage;
```