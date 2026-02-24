```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Flex, Spinner, Center, useToast } from '@chakra-ui/react';
import { Channel } from '../types';
import ChannelList from '../components/chat/ChannelList';
import ChatWindow from '../components/chat/ChatWindow';
import Navbar from '../components/common/Navbar';
import * as channelApi from '../api/channel';

const HomePage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const toast = useToast();

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const allChannels = await channelApi.getAllChannels();
      setChannels(allChannels);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      toast({
        title: 'Error fetching channels.',
        description: 'Could not load chat channels. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingChannels(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSelectChannel = useCallback(async (channelId: number) => {
    try {
      const channelDetails = await channelApi.getChannelById(channelId);
      setSelectedChannel(channelDetails);
    } catch (error) {
      console.error('Failed to fetch channel details:', error);
      toast({
        title: 'Error selecting channel.',
        description: 'Could not load channel details. It might have been deleted.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSelectedChannel(null); // Clear selected channel if fetching fails
    }
  }, [toast]);

  const handleChannelCreated = () => {
    fetchChannels(); // Refresh the list of channels
  };

  const handleChannelJoined = (joinedChannel: Channel) => {
    // Update the channel in the list to reflect new membership
    setChannels((prevChannels) =>
      prevChannels.map((c) => (c.id === joinedChannel.id ? joinedChannel : c))
    );
    // If the joined channel is currently selected, update its details
    if (selectedChannel && selectedChannel.id === joinedChannel.id) {
      setSelectedChannel(joinedChannel);
    }
  };

  if (loadingChannels) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="teal.500" />
      </Center>
    );
  }

  return (
    <Flex h="100vh" direction="column">
      <Navbar />
      <Flex flex="1" overflow="hidden">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={handleSelectChannel}
          onChannelCreated={handleChannelCreated}
          onChannelJoined={handleChannelJoined}
        />
        <ChatWindow channel={selectedChannel} />
      </Flex>
    </Flex>
  );
};

export default HomePage;
```