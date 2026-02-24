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

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ username, email, password });
      toast({
        title: 'Registration successful.',
        description: 'You have been registered and logged in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast({
        title: 'Registration failed.',
        description: errorMessage,
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
          Join ALX Chat!
        </Heading>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl id="register-username">
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                bg="gray.700"
                borderColor="gray.600"
                _hover={{ borderColor: 'teal.500' }}
                _focus={{ borderColor: 'teal.500', boxShadow: '0 0 0 1px teal.500' }}
                color="whiteAlpha.900"
              />
            </FormControl>
            <FormControl id="register-email">
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                bg="gray.700"
                borderColor="gray.600"
                _hover={{ borderColor: 'teal.500' }}
                _focus={{ borderColor: 'teal.500', boxShadow: '0 0 0 1px teal.500' }}
                color="whiteAlpha.900"
              />
            </FormControl>
            <FormControl id="register-password">
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
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
              Register
            </Button>
          </VStack>
        </form>
        <Text mt={4} textAlign="center" color="gray.400">
          Already have an account?{' '}
          <ChakraLink as={Link} to="/login" color="teal.300" fontWeight="bold">
            Log In
          </ChakraLink>
        </Text>
      </Box>
    </Center>
  );
};

export default RegisterPage;
```