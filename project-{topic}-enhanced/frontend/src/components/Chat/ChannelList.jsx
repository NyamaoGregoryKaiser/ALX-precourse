```javascript
import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import channelsApi from '../../api/channels';

function ChannelList() {
  const { user } = useAuth();
  const {
    channels,
    fetchChannels,
    currentChannel,
    setCurrentChannel,
    joinChannel,
    leaveChannel,
  } = useChat();
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user, fetchChannels]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setError('');
    if (!newChannelName.trim()) {
      setError('Channel name cannot be empty.');
      return;
    }
    try {
      await channelsApi.createChannel({ name: newChannelName, description: newChannelDescription });
      setNewChannelName('');
      setNewChannelDescription('');
      fetchChannels(); // Refresh channel list
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create channel.');
    }
  };

  const handleChannelClick = async (channel) => {
    if (currentChannel && currentChannel.id === channel.id) {
      return; // Already in this channel
    }

    // Leave current channel if any
    if (currentChannel) {
      await leaveChannel(currentChannel.id);
    }
    // Join the new channel
    await joinChannel(channel.id);
    setCurrentChannel(channel);
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) {
      return;
    }
    try {
      await channelsApi.deleteChannel(channelId);
      if (currentChannel && currentChannel.id === channelId) {
        setCurrentChannel(null); // Clear current channel if deleted
      }
      fetchChannels(); // Refresh channel list
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete channel.');
    }
  };

  return (
    <div className="channel-list-container">
      <h3>Channels</h3>
      {error && <p className="auth-error">{error}</p>}
      <ul className="channel-list">
        {channels.map((channel) => (
          <li
            key={channel.id}
            className={`channel-list-item ${currentChannel?.id === channel.id ? 'active' : ''}`}
            onClick={() => handleChannelClick(channel)}
          >
            #{channel.name}
            {user?.id === channel.ownerId && (
              <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel.id); }}>Delete</button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreateChannel} className="create-channel-form">
        <input
          type="text"
          placeholder="New channel name"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newChannelDescription}
          onChange={(e) => setNewChannelDescription(e.target.value)}
        />
        <button type="submit">Create Channel</button>
      </form>
    </div>
  );
}

export default ChannelList;
```