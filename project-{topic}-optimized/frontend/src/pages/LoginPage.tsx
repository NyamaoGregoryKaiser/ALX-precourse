```typescript
import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  useToast,
  Link as ChakraLink,
  Heading,
  Center,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      toast({
        title: 'Login successful.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login failed.',
        description: error.response?.data?.message || 'Invalid username or password.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="gray.900">
      <Box p={8} maxWidth="md" borderWidth={1} borderRadius={8} boxShadow="lg" bg="gray.800" w="full">
        <Heading size="lg" textAlign="center" mb={6} color="teal.300">
          Welcome Back to ALX Chat!
        </Heading>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl id="username">
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg="gray.700"
                borderColor="gray.600"
                _hover={{ borderColor: 'teal.500' }}
                _focus={{ borderColor: 'teal.500', boxShadow: '0 0 0 1px teal.500' }}
                color="whiteAlpha.900"
              />
            </FormControl>
            <FormControl id="password">
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                bg="gray.700"
                borderColor="gray.600"
                _hover={{ borderColor: 'teal.500' }}
                _focus={{ borderColor: 'teal.500', boxShadow: '0 0 0 1px teal.500' }}
                color="whiteAlpha.900"
              />
            </FormControl>
            <Button
              type="submit"
              colorScheme="teal"
              size="lg"
              width="full"
              isLoading={loading}
              mt={4}
            >
              Log In
            </Button>
          </VStack>
        </form>
        <Text mt={4} textAlign="center" color="gray.400">
          Don't have an account?{' '}
          <ChakraLink as={Link} to="/register" color="teal.300" fontWeight="bold">
            Sign Up
          </ChakraLink>
        </Text>
      </Box>
    </Center>
  );
};

export default LoginPage;
```