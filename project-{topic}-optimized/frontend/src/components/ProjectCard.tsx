import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Spacer,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { Project } from '../types';
import { Link as RouterLink } from 'react-router-dom';

/**
 * `ProjectCard` component displays a single project's details in a card format.
 * It provides options to view the project details and potentially edit/delete (handled by parent).
 *
 * @param {object} props - Component props.
 * @param {Project} props.project - The project object to display.
 * @param {Function} [props.onDelete] - Optional callback function for delete action.
 * @param {Function} [props.onEdit] - Optional callback function for edit action.
 */
const ProjectCard: React.FC<{ project: Project; onDelete?: (id: string) => void; onEdit?: (project: Project) => void }> = ({
  project,
  onDelete,
  onEdit,
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');

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
      <Flex align="center" mb={2}>
        <Heading fontSize="xl">{project.name}</Heading>
        <Spacer />
        {project.owner && (
          <Badge colorScheme="purple" p={1} borderRadius="md">
            Owner: {project.owner.username}
          </Badge>
        )}
      </Flex>
      <Text mt={2} noOfLines={2} color="gray.500" _dark={{ color: 'gray.400' }}>
        {project.description || 'No description provided.'}
      </Text>
      <Flex mt={4} justifyContent="space-between" alignItems="center">
        <RouterLink to={`/projects/${project.id}`}>
          <Button colorScheme="teal" size="sm" variant="outline">
            View Details
          </Button>
        </RouterLink>
        <Flex>
          {onEdit && (
            <Button size="sm" mr={2} onClick={() => onEdit(project)} variant="ghost">
              Edit
            </Button>
          )}
          {onDelete && (
            <Button size="sm" colorScheme="red" variant="ghost" onClick={() => onDelete(project.id)}>
              Delete
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default ProjectCard;