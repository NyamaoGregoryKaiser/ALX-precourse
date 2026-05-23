import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  useToast,
  Spinner,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Textarea,
  Link,
} from '@chakra-ui/react';
import { DownloadIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import * as api from '../api/preprocessing';
import { PreprocessingPayload, TransformationType, OutputFormat } from '../api/types';

const PreprocessingPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transformationType, setTransformationType] = useState<TransformationType>('normalize');
  const [columnName, setColumnName] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json');
  const [loading, setLoading] = useState(false);
  const [transformedDataDisplay, setTransformedDataDisplay] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: 'Validation Error',
        description: 'Please select a CSV file.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!columnName && (transformationType === 'normalize' || transformationType === 'standardize' || transformationType === 'oneHotEncode')) {
      toast({
        title: 'Validation Error',
        description: 'Column Name is required for this transformation type.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setTransformedDataDisplay(null);
    setDownloadUrl(null);

    try {
      const payload: PreprocessingPayload = {
        file: selectedFile,
        transformationType,
        columnName,
        outputFormat,
      };

      const dataBlob = await api.transformData(payload);

      if (outputFormat === 'json') {
        const text = await dataBlob.text();
        setTransformedDataDisplay(JSON.stringify(JSON.parse(text), null, 2));
      } else { // csv
        const url = URL.createObjectURL(dataBlob);
        setDownloadUrl(url);
        toast({
          title: 'Transformation successful.',
          description: 'A download link for the transformed CSV is available below.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Transformation Failed',
        description: error.response?.data?.message || 'An unexpected error occurred during transformation.',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
      console.error('Preprocessing error:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={8}>
      <Heading as="h1" size="xl" mb={6}>
        Data Preprocessing Utilities
      </Heading>

      <Text fontSize="lg" mb={8}>
        Upload a CSV file, select a transformation, and view/download the transformed data.
      </Text>

      <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
        <form onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            <FormControl isRequired>
              <FormLabel>Upload CSV File</FormLabel>
              <Input type="file" accept=".csv" onChange={handleFileChange} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Transformation Type</FormLabel>
              <Select value={transformationType} onChange={(e) => setTransformationType(e.target.value as TransformationType)}>
                <option value="normalize">Min-Max Normalization</option>
                <option value="standardize">Z-score Standardization</option>
                <option value="oneHotEncode">One-Hot Encoding</option>
              </Select>
            </FormControl>

            {(transformationType === 'normalize' || transformationType === 'standardize' || transformationType === 'oneHotEncode') && (
              <FormControl isRequired>
                <FormLabel>Column Name (for transformation)</FormLabel>
                <Input
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g., age, category"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Enter the name of the column you wish to transform.
                </Text>
              </FormControl>
            )}

            <FormControl>
              <FormLabel>Output Format</FormLabel>
              <Select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </Select>
              <Text fontSize="sm" color="gray.500" mt={1}>
                Choose the format for the transformed data. CSV will trigger a download.
              </Text>
            </FormControl>

            <Button
              type="submit"
              colorScheme="purple"
              isLoading={loading}
              loadingText="Transforming..."
              rightIcon={loading ? undefined : <ExternalLinkIcon />}
              mt={4}
            >
              Apply Transformation
            </Button>
          </VStack>
        </form>
      </Box>

      {loading && (
        <Flex justify="center" align="center" mt={8}>
          <Spinner size="xl" />
        </Flex>
      )}

      {downloadUrl && (
        <Box mt={8} p={4} borderWidth="1px" borderRadius="lg" bg="green.50" textAlign="center">
          <Text fontSize="lg" mb={2}>Transformed CSV Ready!</Text>
          <Link href={downloadUrl} download={`transformed_data_${transformationType}.csv`} style={{ textDecoration: 'none' }}>
            <Button leftIcon={<DownloadIcon />} colorScheme="green" size="lg">
              Download Transformed CSV
            </Button>
          </Link>
        </Box>
      )}

      {transformedDataDisplay && (
        <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="gray.50">
          <Heading as="h2" size="md" mb={4}>
            Transformed Data (JSON Preview)
          </Heading>
          <Textarea
            value={transformedDataDisplay}
            readOnly
            minH="300px"
            fontFamily="monospace"
            resize="vertical"
          />
        </Box>
      )}
    </Box>
  );
};

export default PreprocessingPage;
```