```typescript
import React from 'react';
import { Box, VStack, Text, Button, Input, useToast, Flex, IconButton } from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { Channel } from '../../types';
import * as channelApi from '../../api/channel';
import { useAuth } from '../../auth/AuthProvider';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: number | null;
  onSelectChannel: (channelId: number) => void;
  onChannelCreated: () => void;
  onChannelJoined: (channel: Channel) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelCreated,
  onChannelJoined,
}) => {
  const [newChannelName, setNewChannelName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();
  const { username } = useAuth();

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({
        title: 'Channel name required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setLoading(true);
    try {
      const createdChannel = await channelApi.createChannel(newChannelName);
      toast({
        title: `Channel '${createdChannel.name}' created.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setNewChannelName('');
      onChannelCreated(); // Notify parent to refresh channels
      // Automatically join the creator to the channel
      onChannelJoined(createdChannel);
      onSelectChannel(createdChannel.id);
    } catch (error: any) {
      toast({
        title: 'Error creating channel.',
        description: error.response?.data?.message || 'Could not create channel.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Error creating channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId: number) => {
    setLoading(true);
    try {
      const joinedChannel = await channelApi.joinChannel(channelId);
      toast({
        title: `Joined channel '${joinedChannel.name}'.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onChannelJoined(joinedChannel); // Notify parent to update joined channels
      onSelectChannel(channelId);
    } catch (error: any) {
      toast({
        title: 'Error joining channel.',
        description: error.response?.data?.message || 'Could not join channel.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Error joining channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUserMember = (channel: Channel): boolean => {
    return channel.members?.includes(username || '') || false;
  };

  return (
    <Box w="300px" bg="gray.700" p={4} borderRight="1px" borderColor="gray.600" overflowY="auto">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Channels</Text>

      <Flex mb={4}>
        <Input
          placeholder="New channel name"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCreateChannel();
            }
          }}
          mr={2}
          bg="gray.600"
          _placeholder={{ color: 'gray.400' }}
        />
        <IconButton
          icon={<AddIcon />}
          colorScheme="teal"
          onClick={handleCreateChannel}
          isLoading={loading}
          aria-label="Create channel"
        />
      </Flex>

      <VStack align="stretch" spacing={2}>
        {channels.map((channel) => (
          <Flex key={channel.id} justify="space-between" align="center" p={2} borderRadius="md"
                bg={selectedChannelId === channel.id ? 'teal.600' : 'gray.600'}
                _hover={{ bg: selectedChannelId === channel.id ? 'teal.700' : 'gray.500' }}
                cursor="pointer"
                onClick={() => onSelectChannel(channel.id)}>
            <Text flex="1" isTruncated>{channel.name}</Text>
            {!isUserMember(channel) && (
              <Button size="sm" colorScheme="blue" onClick={(e) => {
                e.stopPropagation(); // Prevent selecting channel when clicking join
                handleJoinChannel(channel.id);
              }}
              isLoading={loading}>
                Join
              </Button>
            )}
            {isUserMember(channel) && selectedChannelId !== channel.id && (
              <Text fontSize="sm" color="teal.300">Member</Text>
            )}
            {isUserMember(channel) && selectedChannelId === channel.id && (
              <Text fontSize="sm" color="whiteAlpha.800">Selected</Text>
            )}
          </Flex>
        ))}
      </VStack>
    </Box>
  );
};

export default ChannelList;
```