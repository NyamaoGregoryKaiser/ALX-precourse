import React from 'react';
import {
  Flex,
  Box,
  Heading,
  Spacer,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Avatar,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * `Header` component for the application.
 * Displays the application title, navigation links, user menu (with profile and logout),
 * and a theme toggler.
 */
const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();

  /**
   * Handles user logout.
   * Calls the logout function from the `useAuth` hook and redirects to the login page.
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      p={4}
      bg={colorMode === 'light' ? 'teal.500' : 'gray.700'}
      color="white"
      boxShadow="md"
    >
      <Heading as="h1" size="md">
        <RouterLink to="/dashboard">Task Management</RouterLink>
      </Heading>

      <Spacer />

      <Flex align="center">
        {/* Navigation Links (can be expanded) */}
        <Box mr={4}>
          <RouterLink to="/dashboard">
            <Button colorScheme="teal" variant="ghost" _hover={{ bg: 'teal.600' }}>
              Dashboard
            </Button>
          </RouterLink>
        </Box>

        {/* Theme Toggle */}
        <IconButton
          aria-label="Toggle color mode"
          icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          mr={4}
          colorScheme="teal"
          variant="ghost"
          _hover={{ bg: 'teal.600' }}
        />

        {/* User Menu */}
        {user ? (
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              colorScheme="teal"
              variant="outline"
              _hover={{ bg: 'teal.600' }}
            >
              <Avatar size="xs" name={user.username} mr={2} />
              <Text display={{ base: 'none', md: 'inline' }}>{user.username}</Text>
            </MenuButton>
            <MenuList color="black">
              <MenuItem onClick={() => navigate('/profile')} disabled>
                Profile (Coming Soon)
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </MenuList>
          </Menu>
        ) : (
          <RouterLink to="/login">
            <Button colorScheme="teal" variant="outline">
              Login
            </Button>
          </RouterLink>
        )}
      </Flex>
    </Flex>
  );
};

export default Header;