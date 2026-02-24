```typescript
import React from 'react';
import { Box, Flex, Text, Button, Spacer, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { useAuth } from '../../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Flex
      as="nav"
      bg="gray.900"
      color="white"
      p={4}
      alignItems="center"
      borderBottom="1px"
      borderColor="gray.700"
    >
      <Text fontSize="2xl" fontWeight="bold">
        ALX Chat
      </Text>
      <Spacer />
      {username && (
        <Menu>
          <MenuButton as={Button} rounded={'full'} variant={'link'} cursor={'pointer'} minW={0}>
            <Flex alignItems="center">
              <Text mr={2} fontSize="lg">
                {username}
              </Text>
              <Avatar size={'sm'} name={username} />
            </Flex>
          </MenuButton>
          <MenuList bg="gray.700" borderColor="gray.600">
            {/* <MenuItem bg="gray.700" _hover={{ bg: 'gray.600' }}>Profile</MenuItem> */}
            <MenuItem bg="gray.700" _hover={{ bg: 'gray.600' }} onClick={handleLogout}>
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </Flex>
  );
};

export default Navbar;
```