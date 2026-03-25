import React from 'react';
import { Flex } from '@chakra-ui/react';
import AuthForm from '../components/AuthForm';

/**
 * `LoginPage` component serves as the entry point for users to log into the system.
 * It primarily renders the `AuthForm` component in its login mode.
 */
const LoginPage: React.FC = () => {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" _dark={{ bg: 'gray.800' }}>
      <AuthForm isRegister={false} />
    </Flex>
  );
};

export default LoginPage;