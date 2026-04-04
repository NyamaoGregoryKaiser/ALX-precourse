```typescript
import React, { useState } from 'react';
import { User } from '../types';
import * as userService from '../services/user';
import './UserSearch.css';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  currentUser: User | null; // Current logged-in user to exclude from search
}

const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    setError(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await userService.searchUsers(query);
      // Filter out the current user from search results
      setSearchResults(results.filter(user => user.id !== currentUser?.id));
    } catch (err: any) {
      setError(err.message || 'Failed to search users.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-search-container">
      <input
        type="text"
        placeholder="Search users by username or email..."
        value={searchTerm}
        onChange={handleSearch}
        className="user-search-input"
      />
      {loading && <p className="loading-message">Searching...</p>}
      {error && <p className="error-message">{error}</p>}
      {searchResults.length > 0 && (
        <ul className="search-results-list">
          {searchResults.map((user) => (
            <li key={user.id} className="search-result-item" onClick={() => onSelectUser(user)}>
              <span className="search-result-username">{user.username}</span>
              <span className={`search-result-status ${user.status.toLowerCase()}`}>
                ({user.status})
              </span>
              <span className="search-result-email">{user.email}</span>
            </li>
          ))}
        </ul>
      )}
      {!loading && searchTerm.length >=2 && searchResults.length === 0 && (
        <p className="no-results-message">No users found.</p>
      )}
    </div>
  );
};

export default UserSearch;
```