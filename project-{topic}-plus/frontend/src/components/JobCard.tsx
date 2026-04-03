```tsx
import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Stack,
  Tag,
  TagLabel,
  useToast,
  Badge,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import {
  useDeleteScrapingJobMutation,
  useRunScrapingJobNowMutation,
} from '../features/jobs/jobsApi';

// Placeholder type
interface Job {
  id: string;
  name: string;
  targetUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'scheduled';
  scheduleCron?: string | null;
  lastRunAt?: string;
}

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const toast = useToast();
  const [deleteJob, { isLoading: isDeleting }] = useDeleteScrapingJobMutation();
  const [runJobNow, { isLoading: isRunningNow }] = useRunScrapingJobNowMutation();

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      try {
        await deleteJob(job.id).unwrap();
        toast({
          title: 'Job deleted.',
          description: `"${job.name}" has been removed.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: 'Error deleting job.',
          description: (error as any)?.data?.message || 'Failed to delete job.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const handleRunNow = async () => {
    try {
      await runJobNow(job.id).unwrap();
      toast({
        title: 'Job enqueued.',
        description: `"${job.name}" has been added to the scraping queue.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error enqueuing job.',
        description: (error as any)?.data?.message || 'Failed to enqueue job.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'running':
        return 'blue';
      case 'scheduled':
        return 'purple';
      case 'pending':
      default:
        return 'gray';
    }
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
      <Heading fontSize="xl" mb={2}>{job.name}</Heading>
      <Text fontSize="sm" color="gray.600" noOfLines={1}>
        URL: <ChakraLink href={job.targetUrl} isExternal>{job.targetUrl}</ChakraLink>
      </Text>
      <Stack direction="row" spacing={2} my={3}>
        <Badge colorScheme={getStatusColor(job.status)}>{job.status.toUpperCase()}</Badge>
        {job.scheduleCron && (
          <Tag size="sm" variant="subtle" colorScheme="orange">
            <TagLabel>Scheduled: {job.scheduleCron}</TagLabel>
          </Tag>
        )}
      </Stack>
      {job.lastRunAt && (
        <Text fontSize="sm" color="gray.500">
          Last run: {new Date(job.lastRunAt).toLocaleString()}
        </Text>
      )}
      <Stack mt={4} direction="row" spacing={3}>
        <RouterLink to={`/jobs/${job.id}`}>
          <Button size="sm" colorScheme="brand">View Details</Button>
        </RouterLink>
        <Button
          size="sm"
          onClick={handleRunNow}
          isLoading={isRunningNow}
          colorScheme="teal"
          variant="outline"
        >
          Run Now
        </Button>
        <Button
          size="sm"
          onClick={handleDelete}
          isLoading={isDeleting}
          colorScheme="red"
          variant="outline"
        >
          Delete
        </Button>
      </Stack>
    </Box>
  );
};

export default JobCard;
```