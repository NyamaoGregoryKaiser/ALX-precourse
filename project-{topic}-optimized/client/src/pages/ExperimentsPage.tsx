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
import * as api from '../api/experiments';
import * as modelApi from '../api/models'; // To fetch models
import * as datasetApi from '../api/datasets'; // To fetch datasets
import { ExperimentRun, CreateExperimentPayload, UpdateExperimentPayload, MLModel, Dataset } from '../api/types';

const ExperimentsPage: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentRun[]>([]);
  const [models, setModels] = useState<MLModel[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentRun | null>(null);
  const toast = useToast();

  const { isOpen: isCreateModalOpen, onOpen: onCreateModalOpen, onClose: onCreateModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isViewDetailModalOpen, onOpen: onViewDetailModalOpen, onClose: onViewDetailModalClose } = useDisclosure();

  // New Experiment State
  const [newExperimentName, setNewExperimentName] = useState('');
  const [newExperimentDescription, setNewExperimentDescription] = useState('');
  const [newExperimentModelId, setNewExperimentModelId] = useState<string | undefined>(undefined);
  const [newExperimentDatasetId, setNewExperimentDatasetId] = useState<string | undefined>(undefined);
  const [newExperimentParameters, setNewExperimentParameters] = useState('');
  const [newExperimentMetrics, setNewExperimentMetrics] = useState('');
  const [newExperimentArtifactsUrl, setNewExperimentArtifactsUrl] = useState('');

  // Edit Experiment State
  const [editExperimentName, setEditExperimentName] = useState('');
  const [editExperimentDescription, setEditExperimentDescription] = useState('');
  const [editExperimentModelId, setEditExperimentModelId] = useState<string | undefined>(undefined);
  const [editExperimentDatasetId, setEditExperimentDatasetId] = useState<string | undefined>(undefined);
  const [editExperimentParameters, setEditExperimentParameters] = useState('');
  const [editExperimentMetrics, setEditExperimentMetrics] = useState('');
  const [editExperimentArtifactsUrl, setEditExperimentArtifactsUrl] = useState('');


  const fetchAllData = async () => {
    setLoading(true);
    try {
      const experimentsData = await api.getExperiments();
      const modelsData = await modelApi.getModels();
      const datasetsData = await datasetApi.getDatasets();
      setExperiments(experimentsData);
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
    fetchAllData();
  }, []);

  const handleCreateOrUpdateExperiment = async (e: React.FormEvent, isEditMode: boolean) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditMode && selectedExperiment) {
        const payload: UpdateExperimentPayload = {
          name: editExperimentName,
          description: editExperimentDescription,
          modelId: editExperimentModelId,
          datasetId: editExperimentDatasetId,
          parametersJson: editExperimentParameters ? JSON.parse(editExperimentParameters) : undefined,
          metricsJson: editExperimentMetrics ? JSON.parse(editExperimentMetrics) : undefined,
          artifactsUrl: editExperimentArtifactsUrl,
        };
        await api.updateExperiment(selectedExperiment.id, payload);
        toast({ title: 'Experiment updated.', status: 'success' });
        onEditModalClose();
      } else {
        const payload: CreateExperimentPayload = {
          name: newExperimentName,
          description: newExperimentDescription,
          modelId: newExperimentModelId,
          datasetId: newExperimentDatasetId,
          parametersJson: newExperimentParameters ? JSON.parse(newExperimentParameters) : undefined,
          metricsJson: newExperimentMetrics ? JSON.parse(newExperimentMetrics) : undefined,
          artifactsUrl: newExperimentArtifactsUrl,
        };
        await api.createExperiment(payload);
        toast({ title: 'Experiment created.', status: 'success' });
        onCreateModalClose();
        // Clear new experiment form state
        setNewExperimentName(''); setNewExperimentDescription(''); setNewExperimentModelId(undefined);
        setNewExperimentDatasetId(undefined); setNewExperimentParameters(''); setNewExperimentMetrics('');
        setNewExperimentArtifactsUrl('');
      }
      fetchAllData();
    } catch (error: any) {
      toast({
        title: `Error ${isEditMode ? 'updating' : 'creating'} experiment.`,
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this experiment?')) {
      try {
        await api.deleteExperiment(id);
        toast({ title: 'Experiment deleted.', status: 'success' });
        fetchAllData();
      } catch (error: any) {
        toast({
          title: 'Error deleting experiment.',
          description: error.response?.data?.message || 'An unexpected error occurred.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const openEditModal = (experiment: ExperimentRun) => {
    setSelectedExperiment(experiment);
    setEditExperimentName(experiment.name);
    setEditExperimentDescription(experiment.description || '');
    setEditExperimentModelId(experiment.modelId);
    setEditExperimentDatasetId(experiment.datasetId);
    setEditExperimentParameters(experiment.parametersJson ? JSON.stringify(experiment.parametersJson, null, 2) : '');
    setEditExperimentMetrics(experiment.metricsJson ? JSON.stringify(experiment.metricsJson, null, 2) : '');
    setEditExperimentArtifactsUrl(experiment.artifactsUrl || '');
    onEditModalOpen();
  };

  const openViewDetailModal = (experiment: ExperimentRun) => {
    setSelectedExperiment(experiment);
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
          Experiment Runs
        </Heading>
        <Button leftIcon={<AddIcon />} colorScheme="purple" onClick={onCreateModalOpen}>
          Log New Experiment
        </Button>
      </Flex>

      {experiments.length === 0 ? (
        <Text>No experiment runs found. Log one to get started!</Text>
      ) : (
        <TableContainer borderWidth="1px" borderRadius="lg" overflowY="auto" maxHeight="600px">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Model</Th>
                <Th>Dataset</Th>
                <Th>Run At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {experiments.map((experiment) => (
                <Tr key={experiment.id}>
                  <Td fontWeight="medium">{experiment.name}</Td>
                  <Td>{experiment.model?.name || 'N/A'}</Td>
                  <Td>{experiment.dataset?.name || 'N/A'}</Td>
                  <Td>{new Date(experiment.runAt).toLocaleDateString()}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="View Details"
                        icon={<ViewIcon />}
                        size="sm"
                        onClick={() => openViewDetailModal(experiment)}
                      />
                      <IconButton
                        aria-label="Edit Experiment"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => openEditModal(experiment)}
                      />
                      <IconButton
                        aria-label="Delete Experiment"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteExperiment(experiment.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Create Experiment Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Log New Experiment Run</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={(e) => handleCreateOrUpdateExperiment(e, false)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Experiment Name</FormLabel>
                  <Input value={newExperimentName} onChange={(e) => setNewExperimentName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={newExperimentDescription} onChange={(e) => setNewExperimentDescription(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Model</FormLabel>
                  <Select
                    placeholder="Select model (optional)"
                    value={newExperimentModelId || ''}
                    onChange={(e) => setNewExperimentModelId(e.target.value || undefined)}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (v{m.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Dataset</FormLabel>
                  <Select
                    placeholder="Select dataset (optional)"
                    value={newExperimentDatasetId || ''}
                    onChange={(e) => setNewExperimentDatasetId(e.target.value || undefined)}
                  >
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} (v{ds.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Parameters (JSON)</FormLabel>
                  <Textarea value={newExperimentParameters} onChange={(e) => setNewExperimentParameters(e.target.value)} placeholder='{"learning_rate": 0.01, "batch_size": 32}' />
                </FormControl>
                <FormControl>
                  <FormLabel>Metrics (JSON)</FormLabel>
                  <Textarea value={newExperimentMetrics} onChange={(e) => setNewExperimentMetrics(e.target.value)} placeholder='{"accuracy": 0.95, "loss": 0.12}' />
                </FormControl>
                <FormControl>
                  <FormLabel>Artifacts URL</FormLabel>
                  <Input value={newExperimentArtifactsUrl} onChange={(e) => setNewExperimentArtifactsUrl(e.target.value)} placeholder="e.g., s3://my-bucket/artifacts/run-123" />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="purple" mr={3} type="submit" isLoading={isSubmitting}>
                Log Experiment
              </Button>
              <Button variant="ghost" onClick={onCreateModalClose}>
                Cancel
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Experiment Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Experiment: {selectedExperiment?.name}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={(e) => handleCreateOrUpdateExperiment(e, true)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Experiment Name</FormLabel>
                  <Input value={editExperimentName} onChange={(e) => setEditExperimentName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={editExperimentDescription} onChange={(e) => setEditExperimentDescription(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Model</FormLabel>
                  <Select
                    placeholder="Select model (optional)"
                    value={editExperimentModelId || ''}
                    onChange={(e) => setEditExperimentModelId(e.target.value || undefined)}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (v{m.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Associated Dataset</FormLabel>
                  <Select
                    placeholder="Select dataset (optional)"
                    value={editExperimentDatasetId || ''}
                    onChange={(e) => setEditExperimentDatasetId(e.target.value || undefined)}
                  >
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} (v{ds.version})</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Parameters (JSON)</FormLabel>
                  <Textarea value={editExperimentParameters} onChange={(e) => setEditExperimentParameters(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Metrics (JSON)</FormLabel>
                  <Textarea value={editExperimentMetrics} onChange={(e) => setEditExperimentMetrics(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Artifacts URL</FormLabel>
                  <Input value={editExperimentArtifactsUrl} onChange={(e) => setEditExperimentArtifactsUrl(e.target.value)} />
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
          <ModalHeader>Experiment Details: {selectedExperiment?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedExperiment && (
              <VStack align="flex-start" spacing={3}>
                <Text><strong>ID:</strong> {selectedExperiment.id}</Text>
                <Text><strong>Description:</strong> {selectedExperiment.description || 'N/A'}</Text>
                <Text><strong>Run At:</strong> {new Date(selectedExperiment.runAt).toLocaleString()}</Text>
                <Text><strong>Associated Model:</strong> {selectedExperiment.model?.name || 'N/A'}</Text>
                <Text><strong>Associated Dataset:</strong> {selectedExperiment.dataset?.name || 'N/A'}</Text>
                <Text><strong>Created By:</strong> {selectedExperiment.createdBy?.username || 'N/A'}</Text>
                <Text><strong>Artifacts URL:</strong>{' '}
                  {selectedExperiment.artifactsUrl ? (
                    <Link href={selectedExperiment.artifactsUrl} isExternal color="teal.500">
                      {selectedExperiment.artifactsUrl} <ExternalLinkIcon mx="2px" />
                    </Link>
                  ) : (
                    'N/A'
                  )}
                </Text>
                <Text><strong>Parameters:</strong></Text>
                <Box whiteSpace="pre-wrap" bg="gray.100" p={3} borderRadius="md" w="full">
                  {selectedExperiment.parametersJson ? JSON.stringify(selectedExperiment.parametersJson, null, 2) : 'No parameters available.'}
                </Box>
                <Text><strong>Metrics:</strong></Text>
                <Box whiteSpace="pre-wrap" bg="gray.100" p={3} borderRadius="md" w="full">
                  {selectedExperiment.metricsJson ? JSON.stringify(selectedExperiment.metricsJson, null, 2) : 'No metrics available.'}
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

export default ExperimentsPage;
```