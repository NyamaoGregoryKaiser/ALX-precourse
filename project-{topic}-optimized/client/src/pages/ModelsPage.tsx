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
  Select,
  HStack,
  Tag,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import * as api from '../api/models';
import * as datasetApi from '../api/datasets'; // To fetch datasets for model creation
import { MLModel, CreateModelPayload, UpdateModelPayload, Dataset } from '../api/types';

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<MLModel[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]); // For linking models to datasets
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const toast = useToast();

  const { isOpen: isCreateModalOpen, onOpen: onCreateModalOpen, onClose: onCreateModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isViewDetailModalOpen, onOpen: onViewDetailModalOpen, onClose: onViewDetailModalClose } = useDisclosure();

  // New Model State
  const [newModelName, setNewModelName] = useState('');
  const [newModelVersion, setNewModelVersion] = useState('1.0.0');
  const [newModelFramework, setNewModelFramework] = useState('');
  const [newModelType, setNewModelType] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [newModelDatasetId, setNewModelDatasetId] = useState<string | undefined>(undefined);
  const [newModelMetrics, setNewModelMetrics] = useState('');
  const [newModelHyperparameters, setNewModelHyperparameters] = useState('');

  // Edit Model State
  const [editModelName, setEditModelName] = useState('');
  const [editModelVersion, setEditModelVersion] = useState('');
  const [editModelFramework, setEditModelFramework] = useState('');
  const [editModelType, setEditModelType] = useState('');
  const [editModelDescription, setEditModelDescription] = useState('');
  const [editModelDatasetId, setEditModelDatasetId] = useState<string | undefined>(undefined);
  const [editModelMetrics, setEditModelMetrics] = useState('');
  const [editModelHyperparameters, setEditModelHyperparameters] = useState('');


  const fetchModelsAndDatasets = async () => {
    setLoading(true);
    try {
      const modelsData = await api.getModels();
      const datasetsData = await datasetApi.getDatasets();
      setModels(modelsData);
      setDatasets(datasetsData);
    } catch (error: any) {
      toast({
        title: 'Error fetching data.',
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
    fetchModelsAndDatasets();
  }, []);

  const handleCreateOrUpdateModel = async (e: React.FormEvent, isEditMode: boolean) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditMode && selectedModel) {
        const payload: UpdateModelPayload = {
          name: editModelName,
          version: editModelVersion,
          framework: editModelFramework,
          type: editModelType,
          description: editModelDescription,
          datasetId: editModelDatasetId,
          metricsJson: editModelMetrics ? JSON.parse(editModelMetrics) : undefined,
          hyperparametersJson: editModelHyperparameters ? JSON.parse(editModelHyperparameters) : undefined,
        };
        await api.updateModel(selectedModel.id, payload);
        toast({ title: 'Model updated.', status: 'success' });
        onEditModalClose();
      } else {
        const payload: CreateModelPayload = {
          name: newModelName,
          version: newModelVersion,
          framework: newModelFramework,
          type: newModelType,
          description: newModelDescription,
          datasetId: newModelDatasetId,
          metricsJson: newModelMetrics ? JSON.parse(newModelMetrics) : undefined,
          hyperparametersJson: newModelHyperparameters ? JSON.parse(newModelHyperparameters) : undefined,
        };
        await api.createModel(payload);
        toast({ title: 'Model created.', status: 'success' });
        onCreateModalClose();
        // Clear new model form state
        setNewModelName(''); setNewModelVersion('1.0.0'); setNewModelFramework(''); setNewModelType('');
        setNewModelDescription(''); setNewModelDatasetId(undefined); setNewModelMetrics(''); setNewModelHyperparameters('');
      }
      fetchModelsAndDatasets();
    } catch (error: any) {
      toast({
        title: `Error ${isEditMode ? 'updating' : 'creating'} model.`,
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      try {
        await api.deleteModel(id);
        toast({ title: 'Model deleted.', status: 'success' });
        fetchModelsAndDatasets();
      } catch (error: any) {
        toast({
          title: 'Error deleting model.',
          description: error.response?.data?.message || 'An unexpected error occurred.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const openEditModal = (model: MLModel) => {
    setSelectedModel(model);
    setEditModelName(model.name);
    setEditModelVersion(model.version);
    setEditModelFramework(model.framework || '');
    setEditModelType(model.type || '');
    setEditModelDescription(model.description || '');
    setEditModelDatasetId(model.datasetId);
    setEditModelMetrics(model.metricsJson ? JSON.stringify(model.metricsJson, null, 2) : '');
    setEditModelHyperparameters(model.hyperparametersJson ? JSON.stringify(model.hyperparametersJson, null, 2) : '');
    onEditModalOpen();
  };

  const openViewDetailModal = (model: MLModel) => {
    setSelectedModel(model);
    onViewDetailModalOpen();
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
          ML Models
        </Heading>
        <Button leftIcon={<AddIcon />} colorScheme="purple" onClick={onCreateModalOpen}>
          Create New Model
        </Button>
      </Flex>

      {models.length === 0 ? (
        <Text>No models found. Create one to get started!</Text>
      ) : (
        <TableContainer borderWidth="1px" borderRadius="lg" overflowY="auto" maxHeight="600px">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Version</Th>
                <Th>Framework</Th>
                <Th>Type</Th>
                <Th>Dataset</Th>
                <Th>Trained At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {models.map((model) => (
                <Tr key={model.id}>
                  <Td fontWeight="medium">{model.name}</Td>
                  <Td><Tag colorScheme="blue">{model.version}</Tag></Td>
                  <Td>{model.framework || 'N/A'}</Td>
                  <Td>{model.type || 'N/A'}</Td>
                  <Td>{model.dataset?.name || 'N/A'}</Td>
                  <Td>{new Date(model.trainedAt).toLocaleDateString()}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="View Details"
                        icon={<ViewIcon />}
                        size="sm"
                        onClick={() => openViewDetailModal(model)}
                      />
                      <IconButton
                        aria-label="Edit Model"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => openEditModal(model)}
                      />
                      <IconButton
                        aria-label="Delete Model"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteModel(model.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Create Model Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Model</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={(e) => handleCreateOrUpdateModel(e, false)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Model Name</FormLabel>
                  <Input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Version</FormLabel>
                  <Input value={newModelVersion} onChange={(e) => setNewModelVersion(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Framework</FormLabel>
                  <Input value={newModelFramework} onChange={(e) => setNewModelFramework(e.target.value)} placeholder="e.g., Scikit-learn, TensorFlow" />
                </FormControl>
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Input value={newModelType} onChange={(e) => setNewModelType(e.target.value)} placeholder="e.g., Classification, Regression" />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={newModelDescription} onChange={(e) => setNewModelDescription(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Dataset</FormLabel>
                  <Select
                    placeholder="Select dataset (optional)"
                    value={newModelDatasetId || ''}
                    onChange={(e) => setNewModelDatasetId(e.target.value || undefined)}
                  >
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} (v{ds.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Metrics (JSON)</FormLabel>
                  <Textarea value={newModelMetrics} onChange={(e) => setNewModelMetrics(e.target.value)} placeholder='{"accuracy": 0.95, "f1_score": 0.88}' />
                </FormControl>
                <FormControl>
                  <FormLabel>Hyperparameters (JSON)</FormLabel>
                  <Textarea value={newModelHyperparameters} onChange={(e) => setNewModelHyperparameters(e.target.value)} placeholder='{"learning_rate": 0.01, "epochs": 100}' />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="purple" mr={3} type="submit" isLoading={isSubmitting}>
                Create Model
              </Button>
              <Button variant="ghost" onClick={onCreateModalClose}>
                Cancel
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Model Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Model: {selectedModel?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={(e) => handleCreateOrUpdateModel(e, true)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Model Name</FormLabel>
                  <Input value={editModelName} onChange={(e) => setEditModelName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Version</FormLabel>
                  <Input value={editModelVersion} onChange={(e) => setEditModelVersion(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Framework</FormLabel>
                  <Input value={editModelFramework} onChange={(e) => setEditModelFramework(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Input value={editModelType} onChange={(e) => setEditModelType(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={editModelDescription} onChange={(e) => setEditModelDescription(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Dataset</FormLabel>
                  <Select
                    placeholder="Select dataset (optional)"
                    value={editModelDatasetId || ''}
                    onChange={(e) => setEditModelDatasetId(e.target.value || undefined)}
                  >
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} (v{ds.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Metrics (JSON)</FormLabel>
                  <Textarea value={editModelMetrics} onChange={(e) => setEditModelMetrics(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Hyperparameters (JSON)</FormLabel>
                  <Textarea value={editModelHyperparameters} onChange={(e) => setEditModelHyperparameters(e.target.value)} />
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

      {/* View Detail Modal */}
      <Modal isOpen={isViewDetailModalOpen} onClose={onViewDetailModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Model Details: {selectedModel?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedModel && (
              <VStack align="flex-start" spacing={3}>
                <Text><strong>ID:</strong> {selectedModel.id}</Text>
                <Text><strong>Version:</strong> <Tag colorScheme="blue">{selectedModel.version}</Tag></Text>
                <Text><strong>Framework:</strong> {selectedModel.framework || 'N/A'}</Text>
                <Text><strong>Type:</strong> {selectedModel.type || 'N/A'}</Text>
                <Text><strong>Description:</strong> {selectedModel.description || 'N/A'}</Text>
                <Text><strong>Associated Dataset:</strong> {selectedModel.dataset?.name || 'N/A'}</Text>
                <Text><strong>Trained At:</strong> {new Date(selectedModel.trainedAt).toLocaleString()}</Text>
                <Text><strong>Created By:</strong> {selectedModel.createdBy?.username || 'N/A'}</Text>
                <Text><strong>Metrics:</strong></Text>
                <Box whiteSpace="pre-wrap" bg="gray.100" p={3} borderRadius="md" w="full">
                  {selectedModel.metricsJson ? JSON.stringify(selectedModel.metricsJson, null, 2) : 'No metrics available.'}
                </Box>
                <Text><strong>Hyperparameters:</strong></Text>
                <Box whiteSpace="pre-wrap" bg="gray.100" p={3} borderRadius="md" w="full">
                  {selectedModel.hyperparametersJson ? JSON.stringify(selectedModel.hyperparametersJson, null, 2) : 'No hyperparameters available.'}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewDetailModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ModelsPage;
```