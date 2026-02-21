import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosConfig';
import Card from '../components/Card';
import Input from '../components/Input';
import { validMLTaskTypes } from '../../constants/mlTaskTypes'; // Assuming you define these in a constants file
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

const MLTaskFormPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState('');
  const [inputData, setInputData] = useState('');
  const [parameters, setParameters] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputDataChange = (e) => {
    setInputData(e.target.value);
  };

  const handleParametersChange = (e) => {
    setParameters(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const parsedInputData = JSON.parse(inputData);
      const parsedParameters = parameters ? JSON.parse(parameters) : {};

      const response = await axiosInstance.post(`/projects/${projectId}/ml-tasks`, {
        type: taskType,
        inputData: parsedInputData,
        parameters: parsedParameters,
      });

      setSuccessMessage(`ML Task "${response.data.data.mlTask.type}" created and executed successfully!`);
      // Optionally navigate back to project details after a delay
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to create ML task:', err);
      setError(err.response?.data?.message || 'Failed to create ML task. Check JSON format and parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6 flex items-center">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-blue-600 hover:text-blue-800 flex items-center mr-4">
          <ChevronLeftIcon className="h-5