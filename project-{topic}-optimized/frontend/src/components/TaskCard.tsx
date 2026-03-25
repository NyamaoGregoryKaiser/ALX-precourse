import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Badge,
  useColorModeValue,
  Spacer,
  VStack,
} from '@chakra-ui/react';
import { Task, TaskStatusEnum } from '../types';

/**
 * Helper function to map TaskStatusEnum to Chakra UI color schemes.
 * @param {TaskStatusEnum} status - The status of the task.
 * @returns {string} The corresponding Chakra UI color scheme.
 */
const getStatusColor = (status: TaskStatusEnum): string => {
  switch (status) {
    case TaskStatusEnum.TODO:
      return 'blue';
    case TaskStatusEnum.IN_PROGRESS:
      return 'orange';
    case TaskStatusEnum.DONE:
      return 'green';
    case TaskStatusEnum.BLOCKED:
      return 'red';
    case TaskStatusEnum.CANCELED:
      return 'gray';
    default:
      return 'gray';
  }
};

/**
 * `TaskCard` component displays a single task's details in a card format.
 * It shows title, description, status, priority, due date, and assigned user.
 * It also provides options to edit and delete the task.
 *
 * @param {object} props - Component props.
 * @param {Task} props.task - The task object to display.
 * @param {Function} [props.onDelete] - Optional callback function for delete action.
 * @param {Function} [props.onEdit] - Optional callback function for edit action.
 */
const TaskCard: React.FC<{ task: Task; onDelete?: (id: string) => void; onEdit?: (task: Task) => void }> = ({
  task,
  onDelete,
  onEdit,
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const subTextColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      bg={cardBg}
      color={textColor}
      _hover={{ boxShadow: 'xl' }}
      transition="all 0.2s ease-in-out"
    >
      <VStack align="flex-start" spacing={2}>
        <Flex width="100%" align="center">
          <Heading fontSize="lg" noOfLines={1}>{task.title}</Heading>
          <Spacer />
          <Badge colorScheme={getStatusColor(task.status)} fontSize="0.7em" textTransform="uppercase">
            {task.status.replace('_', ' ')}
          </Badge>
        </Flex>
        <Text fontSize="sm" noOfLines={2} color={subTextColor}>
          {task.description || 'No description provided.'}
        </Text>
        <Flex width="100%" justifyContent="space-between" fontSize="sm" color={subTextColor}>
          <Text>
            Priority: <Badge colorScheme="blue">{task.priority}</Badge>
          </Text>
          <Text>
            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
          </Text>
        </Flex>
        <Flex width="100%" justifyContent="space-between" fontSize="sm" color={subTextColor}>
          <Text>
            Assigned to: {task.assignedTo ? task.assignedTo.username : 'Unassigned'}
          </Text>
        </Flex>
      </VStack>

      <Flex mt={4} justifyContent="flex-end">
        {onEdit && (
          <Button size="sm" mr={2} onClick={() => onEdit(task)} variant="ghost" colorScheme="teal">
            Edit
          </Button>
        )}
        {onDelete && (
          <Button size="sm" colorScheme="red" variant="ghost" onClick={() => onDelete(task.id)}>
            Delete
          </Button>
        )}
      </Flex>
    </Box>
  );
};

export default TaskCard;