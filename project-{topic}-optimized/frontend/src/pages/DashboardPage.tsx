import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Flex,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Spinner,
  SimpleGrid,
  Spacer,
} from '@chakra-ui/react';
import ProjectCard from '../components/ProjectCard';
import api from '../api/api';
import { Project, CreateProject, UpdateProject } from '../types';
import { useAuth } from '../hooks/useAuth';

/**
 * `DashboardPage` component displays a user's projects and allows them to manage them.
 * This includes fetching, creating, updating, and deleting projects.
 */
const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null); // For edit
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const toast = useToast();
  const { user } = useAuth(); // Get current user for context

  /**
   * Fetches all projects accessible by the current user.
   */
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Project[]>('/projects');
      setProjects(response.data);
    } catch (error: any) {
      toast({
        title: 'Error fetching projects.',
        description: error.response?.data?.message || 'Could not load projects.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]); // Refetch when user changes or first loaded

  /**
   * Handles opening the modal for creating a new project.
   */
  const handleCreateProject = () => {
    setCurrentProject(null);
    setProjectName('');
    setProjectDescription('');
    setIsModalOpen(true);
  };

  /**
   * Handles opening the modal for editing an existing project.
   * @param {Project} project - The project to be edited.
   */
  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setIsModalOpen(true);
  };

  /**
   * Handles submitting the project form (create or update).
   */
  const handleSaveProject = async () => {
    try {
      if (currentProject) {
        // Update project
        const updateData: UpdateProject = {
          name: projectName,
          description: projectDescription,
        };
        await api.patch(`/projects/${currentProject.id}`, updateData);
        toast({
          title: 'Project updated.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new project
        const createData: CreateProject = {
          name: projectName,
          description: projectDescription,
        };
        await api.post('/projects', createData);
        toast({
          title: 'Project created.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      setIsModalOpen(false);
      fetchProjects(); // Refresh project list
    } catch (error: any) {
      toast({
        title: `Error ${currentProject ? 'updating' : 'creating'} project.`,
        description: Array.isArray(error.response?.data?.message)
          ? error.response?.data?.message.join(', ')
          : error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  /**
   * Handles deleting a project.
   * @param {string} projectId - The ID of the project to delete.
   */
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? All associated tasks will also be deleted.')) {
      return;
    }
    try {
      await api.delete(`/projects/${projectId}`);
      toast({
        title: 'Project deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchProjects(); // Refresh project list
    } catch (error: any) {
      toast({
        title: 'Error deleting project.',
        description: error.response?.data?.message || 'Could not delete project.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Flex flex={1} align="center" justify="center">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  return (
    <Box p={8} flex={1}>
      <Flex mb={6} align="center">
        <Heading as="h2" size="xl">
          Your Projects
        </Heading>
        <Spacer />
        <Button colorScheme="teal" onClick={handleCreateProject}>
          Create New Project
        </Button>
      </Flex>

      {projects.length === 0 ? (
        <Text fontSize="lg" color="gray.500">
          No projects found. Start by creating a new one!
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
              onEdit={handleEditProject}
            />
          ))}
        </SimpleGrid>
      )}

      {/* Project Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{currentProject ? 'Edit Project' : 'Create New Project'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Project Name</FormLabel>
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Project description (optional)"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={handleSaveProject}>
              Save
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DashboardPage;