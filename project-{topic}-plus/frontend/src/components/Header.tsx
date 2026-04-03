```tsx
import React from 'react';
import { Box, Flex, Text, Button, Link as ChakraLink, Spacer, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';

const Header: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box bg={bgColor} px={4} py={3} borderBottom="1px" borderColor="gray.200">
      <Flex alignItems="center" maxW="container.xl" mx="auto">
        <RouterLink to="/">
          <Text fontSize="xl" fontWeight="bold" color="brand.700">
            ScrapeMaster
          </Text>
        </RouterLink>

        <Spacer />

        <Flex as="nav" alignItems="center">
          <RouterLink to="/">
            <ChakraLink px={2} color={textColor}>Home</ChakraLink>
          </RouterLink>

          {user ? (
            <>
              <RouterLink to="/jobs">
                <ChakraLink px={2} color={textColor}>My Jobs</ChakraLink>
              </RouterLink>
              <Text px={2} color={textColor}>Hello, {user.username}</Text>
              <Button onClick={handleLogout} colorScheme="red" size="sm" ml={4}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <RouterLink to="/login">
                <ChakraLink px={2} color={textColor}>Login</ChakraLink>
              </RouterLink>
              <RouterLink to="/register">
                <Button colorScheme="brand" size="sm" ml={4}>
                  Register
                </Button>
              </RouterLink>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;
```