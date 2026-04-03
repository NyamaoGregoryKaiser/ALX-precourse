```tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Alert,
  AlertIcon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import { useAppDispatch } from '../app/hooks';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading, isSuccess, isError, error }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSuccess) {
      navigate('/jobs'); // Redirect to jobs page on successful login
    }
  }, [isSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ username, password }).unwrap();
      dispatch(setCredentials(response));
    } catch (err) {
      console.error('Failed to login:', err);
      // Error message handled by Alert component
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={6} borderWidth={1} borderRadius="lg" boxShadow="lg">
      <Heading as="h2" size="xl" textAlign="center" mb={6}>
        Login to ScrapeMaster
      </Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl id="username">
            <FormLabel>Username</FormLabel>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </FormControl>
          <FormControl id="password">
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={isLoading}
            width="full"
          >
            Login
          </Button>
        </VStack>
      </form>
      {isError && (
        <Alert status="error" mt={4}>
          <AlertIcon />
          {(error as any)?.data?.message || 'Login failed. Please try again.'}
        </Alert>
      )}
      <Box mt={4} textAlign="center">
        <Text>
          Don't have an account?{' '}
          <RouterLink to="/register">
            <ChakraLink color="brand.700">Register here</ChakraLink>
          </RouterLink>
        </Text>
      </Box>
    </Box>
  );
};

export default LoginPage;
```