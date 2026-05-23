import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  useToast,
  Spinner,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
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
  VStack,
  useDisclosure,
  IconButton,
  Tag,
  Badge,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import * as api from '../api/datasets';
import { Dataset, ColumnSchema, CreateDatasetPayload, UpdateDatasetPayload } from '../api/types';

const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const toast = useToast();

  const { isOpen: isCreateModalOpen, onOpen: onCreateModalOpen, onClose: onCreateModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isViewSchemaModalOpen, onOpen: onViewSchemaModalOpen, onClose: onViewSchemaModalClose } = useDisclosure();

  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDescription, setNewDatasetDescription] = useState('');
  const [newDatasetFile, setNewDatasetFile] = useState<File | null>(null);

  const [editDatasetName, setEditDatasetName] = useState('');
  const [editDatasetDescription, setEditDatasetDescription] = useState('');

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (error: any) {
      toast({
        title: 'Error fetching datasets.',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName || !newDatasetFile) {
      toast({
        title: 'Validation Error',
        description: 'Dataset Name and File are required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateDatasetPayload = {
        name: newDatasetName,
        description: newDatasetDescription,
        file: newDatasetFile,
      };
      await api.createDataset(payload);
      toast({
        title: 'Dataset created.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onCreateModalClose();
      fetchDatasets();
      setNewDatasetName('');
      setNewDatasetDescription('');
      setNewDatasetFile(null);
    } catch (error: any) {
      toast({
        title: 'Error creating dataset.',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset || !editDatasetName) {
      toast({
        title: 'Validation Error',
        description: 'Dataset Name is required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateDatasetPayload = {
        name: editDatasetName,
        description: editDatasetDescription,
      };
      await api.updateDataset(selectedDataset.id, payload);
      toast({
        title: 'Dataset updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditModalClose();
      fetchDatasets();
    } catch (error: any) {
      toast({
        title: 'Error updating dataset.',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      try {
        await api.deleteDataset(id);
        toast({
          title: 'Dataset deleted.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchDatasets();
      } catch (error: any) {
        toast({
          title: 'Error deleting dataset.',
          description: error.response?.data?.message || 'An unexpected error occurred.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const openEditModal = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setEditDatasetName(dataset.name);
    setEditDatasetDescription(dataset.description || '');
    onEditModalOpen();
  };

  const openViewSchemaModal = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    onViewSchemaModalOpen();
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="calc(100vh - 60px)">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={8}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl">
          Datasets
        </Heading>
        <Button leftIcon={<AddIcon />} colorScheme="purple" onClick={onCreateModalOpen}>
          Upload New Dataset
        </Button>
      </Flex>

      {datasets.length === 0 ? (
        <Text>No datasets found. Upload one to get started!</Text>
      ) : (
        <TableContainer borderWidth="1px" borderRadius="lg" overflowY="auto" maxHeight="600px">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Version</Th>
                <Th>Description</Th>
                <Th>Uploaded By</Th>
                <Th>Uploaded At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {datasets.map((dataset) => (
                <Tr key={dataset.id}>
                  <Td fontWeight="medium">{dataset.name}</Td>
                  <Td><Badge colorScheme="blue">{dataset.version}</Badge></Td>
                  <Td maxW="200px" isTruncated>{dataset.description || 'N/A'}</Td>
                  <Td>{dataset.createdBy?.username || 'System'}</Td>
                  <Td>{new Date(dataset.uploadedAt).toLocaleDateString()}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="View Schema"
                        icon={<ViewIcon />}
                        size="sm"
                        onClick={() => openViewSchemaModal(dataset)}
                      />
                      <IconButton
                        aria-label="Edit Dataset"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => openEditModal(dataset)}
                      />
                      <IconButton
                        aria-label="Delete Dataset"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteDataset(dataset.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Create Dataset Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload New Dataset</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleCreateDataset}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Dataset Name</FormLabel>
                  <Input value={newDatasetName} onChange={(e) => setNewDatasetName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={newDatasetDescription} onChange={(e) => setNewDatasetDescription(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Select CSV File</FormLabel>
                  <Input type="file" accept=".csv" onChange={(e) => setNewDatasetFile(e.target.files ? e.target.files[0] : null)} />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="purple" mr={3} type="submit" isLoading={isSubmitting}>
                Upload
              </Button>
              <Button variant="ghost" onClick={onCreateModalClose}>
                Cancel
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Dataset Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Dataset: {selectedDataset?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditDataset}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Dataset Name</FormLabel>
                  <Input value={editDatasetName} onChange={(e) => setEditDatasetName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={editDatasetDescription} onChange={(e) => setEditDatasetDescription(e.target.value)} />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="purple" mr={3} type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
              <Button variant="ghost" onClick={onEditModalClose}>
                Cancel
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* View Schema Modal */}
      <Modal isOpen={isViewSchemaModalOpen} onClose={onViewSchemaModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schema for "{selectedDataset?.name}"</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDataset?.schemaJson && Array.isArray(selectedDataset.schemaJson) && selectedDataset.schemaJson.length > 0 ? (
              <Table variant="striped">
                <Thead>
                  <Tr>
                    <Th>Column Name</Th>
                    <Th>Inferred Type</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(selectedDataset.schemaJson as ColumnSchema[]).map((col, index) => (
                    <Tr key={index}>
                      <Td>{col.name}</Td>
                      <Td><Tag colorScheme="blue">{col.type}</Tag></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text>No schema information available for this dataset.</Text>
            )}
            {selectedDataset?.fileUrl && (
              <Text mt={4} fontSize="sm" color="gray.500">
                File Location: {selectedDataset.fileUrl}
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewSchemaModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DatasetsPage;
```