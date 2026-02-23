```javascript
import React, { useState, useEffect } from 'react';
import projectService from '../../services/projectService';
import LoadingSpinner from '../common/LoadingSpinner';

function AddMemberModal({ projectId, currentMembers, onAdd, onCancel }) {
  const [potentialMembers, setPotentialMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPotentialMembers = async () => {
      setLoading(true);
      setError('');
      try {
        const allUsers = await projectService.getPotentialProjectMembers(projectId);
        setPotentialMembers(allUsers);
        if (allUsers.length > 0) {
          setSelectedUserId(allUsers[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch potential members.');
      } finally {
        setLoading(false);
      }
    };

    fetchPotentialMembers();
  }, [projectId, currentMembers]); // Re-fetch if currentMembers change

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selected