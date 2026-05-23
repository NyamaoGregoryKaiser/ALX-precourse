import React from 'react';
import { Box, Flex, Link, Button, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Box bg="brand.800" px={4} py={2} color="white" position="fixed" top="0" width="100%" zIndex="100">
      <Flex h={12} alignItems="center" justifyContent="space-between">
        <Flex alignItems="center">
          <Text fontSize="xl" fontWeight="bold">
            <Link as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
              ML Utils Hub
            </Link>
          </Text>
          {isAuthenticated && (
            <Flex ml={10} display={{ base: 'none', md: 'flex' }}>
              <Link as={RouterLink} to="/datasets" px={3} py={1} rounded={'md'} _hover={{ bg: 'brand.700' }}>
                Datasets
              </Link>
              <Link as={RouterLink} to="/models" px={3} py={1} rounded={'md'} _hover={{ bg: 'brand.700' }}>
                Models
              </Link>
              <Link as={RouterLink} to="/experiments" px={3} py={1} rounded={'md'} _hover={{ bg: 'brand.700' }}>
                Experiments
              </Link>
              <Link as={RouterLink} to="/preprocessing" px={3} py={1} rounded={'md'} _hover={{ bg: 'brand.700' }}>
                Preprocessing
              </Link>
            </Flex>
          )}
        </Flex>

        <Flex alignItems="center">
          {isAuthenticated ? (
            <>
              <Text mr={4}>Welcome, {user?.username}</Text>
              <Button onClick={logout} colorScheme="purple" size="sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button as={RouterLink} to="/login" colorScheme="purple" size="sm" mr={2}>
                Login
              </Button>
              <Button as={RouterLink} to="/register" colorScheme="blue" size="sm">
                Register
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar;
```