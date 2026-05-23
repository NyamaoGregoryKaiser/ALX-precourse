import React, { useState } from 'react';
import { Box, Heading, FormControl, FormLabel, Input, Button, Link, Text, useToast, VStack } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/'); // Redirect to dashboard if already authenticated
    }
  }, [isAuthenticated, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      toast({
        title: 'Login Successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
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
    <Flex align="center" justify="center" h="calc(100vh - 60px)"> {/* Adjust for Navbar height */}
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg">
        <Box textAlign="center">
          <Heading mb={4}>Login</Heading>
        </Box>
        <Box my={4} textAlign="left">
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              <Button width="full" mt={4} colorScheme="purple" type="submit" isLoading={loading}>
                Sign In
              </Button>
            </VStack>
          </form>
          <Text mt={4} textAlign="center">
            Don't have an account?{' '}
            <Link as={RouterLink} to="/register" color="teal.500">
              Register here
            </Link>
          </Text>
        </Box>
      </Box>
    </Flex>
  );
};

export default LoginPage;
```