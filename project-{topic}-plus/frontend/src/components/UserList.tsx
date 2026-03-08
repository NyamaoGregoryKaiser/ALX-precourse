```typescript
import React from 'react';
import { User } from 'types';
import { UserIcon } from '@heroicons/react/24/solid';

interface UserListProps {
  users: User[];
  title?: string;
}

const UserList: React.FC<UserListProps> = ({ users, title = 'Users in Room' }) => {
  return (
    <div className="w-64 bg-surface border-l border-border flex flex-col p-4 overflow-y-auto">
      <h3 className="text-xl font-bold text-text mb-4">{title}</h3>
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-textSecondary text-sm">No users connected.</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center p-2 bg-background rounded-lg shadow-sm">
              <UserIcon className="h-6 w-6 text-primary mr-3" />
              <span className="font-semibold text-text">{user.username}</span>
              {/* Could add online status indicator here */}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
```