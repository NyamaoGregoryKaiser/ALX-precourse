import React from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  Link,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginUser, RegisterUser } from '../types';

/**
 * `AuthForm` component provides a reusable form for user authentication (login/register).
 * It dynamically adjusts its fields and behavior based on the `isRegister` prop.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.isRegister - If true, renders a registration form; otherwise, a login form.
 */
const AuthForm: React.FC<{ isRegister?: boolean }> = ({ isRegister = false }) => {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { login: authLogin, register: authRegister } = useAuth();

  /**
   * Handles form submission for both login and registration.
   * Calls the appropriate authentication function from `useAuth` hook.
   * Displays toast notifications for success or error.
   * @param {React.FormEvent} event - The form submission event.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        const registerData: RegisterUser = { username, email, password };
        await authRegister(registerData);
        toast({
          title: 'Registration Successful.',
          description: 'You can now log in with your new account.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/login'); // Redirect to login after successful registration
      } else {
        const loginData: LoginUser = { username, password };
        await authLogin(loginData);
        toast({
          title: 'Login Successful.',
          description: 'Welcome back!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/dashboard'); // Redirect to dashboard after successful login
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        `Failed to ${isRegister ? 'register' : 'log in'}.`;
      toast({
        title: 'Authentication Error',
        description: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8} maxWidth="md" borderWidth={1} borderRadius={8} boxShadow="lg">
      <Stack align="center" spacing={4}>
        <Heading fontSize="2xl" mb={4}>
          {isRegister ? 'Create Your Account' : 'Sign in to your account'}
        </Heading>
      </Stack>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl id="username">
            <FormLabel>Username</FormLabel>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </FormControl>

          {isRegister && (
            <FormControl id="email">
              <FormLabel>Email address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormControl>
          )}

          <FormControl id="password">
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormControl>

          <Button type="submit" colorScheme="teal" size="lg" isLoading={isLoading}>
            {isRegister ? 'Register' : 'Sign In'}
          </Button>

          <Text align="center">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link as={RouterLink} to={isRegister ? '/login' : '/register'} color="teal.500">
              {isRegister ? 'Sign In' : 'Sign Up'}
            </Link>
          </Text>
        </Stack>
      </form>
    </Box>
  );
};

export default AuthForm;