import React, { useState } from 'react';
import { Box, Heading, FormControl, FormLabel, Input, Button, Link, Text, useToast, VStack, Flex } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/'); // Redirect to dashboard if already authenticated
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ username, email, password });
      toast({
        title: 'Registration Successful',
        description: 'You can now log in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex align="center" justify="center" h="calc(100vh - 60px)">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg">
        <Box textAlign="center">
          <Heading mb={4}>Register</Heading>
        </Box>
        <Box my={4} textAlign="left">
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              <Button width="full" mt={4} colorScheme="blue" type="submit" isLoading={loading}>
                Register
              </Button>
            </VStack>
          </form>
          <Text mt={4} textAlign="center">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="teal.500">
              Login here
            </Link>
          </Text>
        </Box>
      </Box>
    </Flex>
  );
};

export default RegisterPage;
```