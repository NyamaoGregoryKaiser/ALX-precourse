import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Flex,
  useToast,
  Button,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  ModalFooter,
  SimpleGrid,
  Spacer,
} from '@chakra-ui/react';
import api from '../api/api';
import { Project, Task, CreateTask, UpdateTask, AuthUser, TaskStatusEnum } from '../types';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../hooks/useAuth';

/**
 * `ProjectDetailPage` component displays the details of a specific project,
 * including its tasks. It allows for creating, updating, and deleting tasks within the project.
 */
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null); // For editing task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatusEnum>(TaskStatusEnum.TODO);
  const [taskPriority, setTaskPriority] = useState(0);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedToId, setTaskAssignedToId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>([]); // To assign tasks
  const toast = useToast();
  const { user: currentUser } = useAuth(); // Current logged-in user

  /**
   * Fetches the project details and its associated tasks.
   */
  const fetchProjectAndTasks = async () => {
    setIsLoading(true);
    try {
      if (!projectId) return;

      const projectResponse = await api.get<Project>(`/projects/${projectId}`);
      setProject(projectResponse.data);
      setTasks(projectResponse.data.tasks || []); // Tasks are eager-loaded with project

      // Fetch all users to populate assignee dropdown, only for admins/managers
      if (
        currentUser?.roles.includes('ADMIN') ||
        currentUser?.roles.includes('MANAGER')
      ) {
        const usersResponse = await api.get<AuthUser[]>('/users');
        setAvailableUsers(usersResponse.data);
      } else {
        // For regular users, only display themselves as an option
        setAvailableUsers([currentUser as AuthUser]);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching project details.',
        description: error.response?.data?.message || 'Could not load project.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId, currentUser]); // Refetch when projectId or currentUser changes

  /**
   * Handles opening the modal for creating a new task.
   */
  const handleCreateTask = () => {
    setCurrentTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus(TaskStatusEnum.TODO);
    setTaskPriority(0);
    setTaskDueDate('');
    setTaskAssignedToId('');
    setIsTaskModalOpen(true);
  };

  /**
   * Handles opening the modal for editing an existing task.
   * @param {Task} task - The task to be edited.
   */
  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setTaskAssignedToId(task.assignedToId || '');
    setIsTaskModalOpen(true);
  };

  /**
   * Handles submitting the task form (create or update).
   */
  const handleSaveTask = async () => {
    try {
      if (!projectId) return;

      const taskData: CreateTask | UpdateTask = {
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        priority: Number(taskPriority),
        dueDate: taskDueDate || undefined,
        projectId: projectId,
        assignedToId: taskAssignedToId || undefined,
      };

      if (current