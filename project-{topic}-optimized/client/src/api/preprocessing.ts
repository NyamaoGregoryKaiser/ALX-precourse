import apiClient from './index';
import { PreprocessingPayload } from './types';

export const transformData = async (payload: PreprocessingPayload): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('transformationType', payload.transformationType);
  if (payload.columnName) formData.append('columnName', payload.columnName);
  formData.append('outputFormat', payload.outputFormat);

  const response = await apiClient.post('/preprocessing/transform', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob', // Important for file downloads
  });
  return response.data;
};
```