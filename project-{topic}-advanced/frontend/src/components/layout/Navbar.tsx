import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
}

const NavWrapper = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--header-height);
  background-color: var(--dark-color);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const Brand = styled(Link)`
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;

  a {
    color: white;
    text-decoration: none;
    font-size: 1.1rem;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const LogoutButton = styled.button`
  background-color: var(--danger-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  border: none;
  font-size: 1rem;
  &:hover {
    background-color: #bd2130;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  display: flex; // Show only when authenticated
  align-items: center;
  margin-right: 1rem; // Space between menu and brand
  @media (min-width: 769px) {
    display: none; // Hide on larger screens if sidebar is always visible or not used
  }
`;

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <NavWrapper>
      {isAuthenticated && <MenuButton onClick={onMenuClick}>☰</MenuButton>}
      <Brand to={isAuthenticated ? "/dashboards" : "/login"}>Vizify</Brand>
      <NavLinks>
        {isAuthenticated ? (
          <>
            <Link to="/dashboards">Dashboards</Link>
            <Link to="/data-sources">Data Sources</Link>
            <Link to="/profile">Profile</Link>
            <span>Hello, {user?.username} ({user?.role})</span>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </NavLinks>
    </NavWrapper>
  );
};

export default Navbar;