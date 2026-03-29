```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const NavWrapper = styled.nav`
  background-color: var(--dark-color);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

const Brand = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;

  &:hover {
    color: var(--primary-color);
    text-decoration: none;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
`;

const NavItem = styled(Link)`
  color: white;
  text-decoration: none;
  margin-left: 1.5rem;
  font-size: 1rem;
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary-color);
    text-decoration: none;
  }
`;

const LogoutButton = styled.button`
  background-color: var(--danger-color);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-left: 1.5rem;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: darken(var(--danger-color), 10%);
  }
`;

const UserInfo = styled.span`
  margin-left: 1.5rem;
  color: var(--light-color);
  font-size: 0.9rem;
`;

/**
 * Navigation bar component for the application.
 * Displays links and logout button based on authentication status.
 */
const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user, role } = useAuth(); // Assume `user` object is also available in context for displaying email
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <NavWrapper>
      <Brand to="/dashboard">My DevOps App</Brand>
      <NavLinks>
        {isAuthenticated ? (
          <>
            <NavItem to="/dashboard">Dashboard</NavItem>
            {/* Assuming AuthContext can expose user's email or a display name */}
            {user?.email && <UserInfo>Logged in as: {user.email} ({role})</UserInfo>}
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </>
        ) : (
          <>
            <NavItem to="/login">Login</NavItem>
            <NavItem to="/register">Register</NavItem>
          </>
        )}
      </NavLinks>
    </NavWrapper>
  );
};

export default Navbar;
```