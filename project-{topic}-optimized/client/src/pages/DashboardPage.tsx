import React from 'react';
import { Box, Heading, Text, Flex, Grid, GridItem, Stat, StatLabel, StatNumber, StatHelpText, Icon } from '@chakra-ui/react';
import { MdOutlineDataUsage, MdAnalytics, MdScience } from 'react-icons/md'; // Icons

const DashboardPage: React.FC = () => {
  // Placeholder for dashboard stats
  const stats = {
    totalDatasets: 15,
    activeModels: 8,
    experimentsRun: 42,
  };

  return (
    <Box p={8}>
      <Heading as="h1" size="xl" mb={6}>
        Welcome to ML Utils Hub!
      </Heading>

      <Text fontSize="lg" mb={8}>
        Your central place for managing ML project metadata and performing data preprocessing tasks.
      </Text>

      <Heading as="h2" size="lg" mb={4}>
        Overview
      </Heading>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
        <GridItem>
          <Stat p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <StatLabel>Total Datasets</StatLabel>
                <StatNumber fontSize="2xl">{stats.totalDatasets}</StatNumber>
                <StatHelpText>Managed datasets</StatHelpText>
              </Box>
              <Icon as={MdOutlineDataUsage} w={10} h={10} color="purple.500" />
            </Flex>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <StatLabel>Active Models</StatLabel>
                <StatNumber fontSize="2xl">{stats.activeModels}</StatNumber>
                <StatHelpText>Currently tracked models</StatHelpText>
              </Box>
              <Icon as={MdAnalytics} w={10} h={10} color="teal.500" />
            </Flex>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="white">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <StatLabel>Experiments Run</StatLabel>
                <StatNumber fontSize="2xl">{stats.experimentsRun}</StatNumber>
                <StatHelpText>Total experiments logged</StatHelpText>
              </Box>
              <Icon as={MdScience} w={10} h={10} color="blue.500" />
            </Flex>
          </Stat>
        </GridItem>
      </Grid>

      {/* You can add more sections here like recent activities, quick links etc. */}
      <Box mt={10}>
        <Heading as="h2" size="lg" mb={4}>
          Quick Links
        </Heading>
        {/* Placeholder for quick links */}
        <Flex gap={4}>
          <Link href="/datasets" color="teal.500">Manage Datasets</Link>
          <Link href="/models" color="teal.500">Track Models</Link>
          <Link href="/preprocessing" color="teal.500">Transform Data</Link>
        </Flex>
      </Box>
    </Box>
  );
};

export default DashboardPage;
```