import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const StyledSidebar = styled.div<{ isOpen: boolean }>`
  width: 250px;
  background-color: var(--dark-color);
  color: white;
  position: fixed;
  top: var(--header-height); /* Below the navbar */
  left: ${(props) => (props.isOpen ? '0' : '-250px')};
  height: calc(100% - var(--header-height));
  transition: left 0.3s ease-in-out;
  padding-top: 1rem;
  z-index: 999; /* Below Navbar, above main content */
  box-shadow: 2px 0 5px rgba(0,0,0,0.2);

  @media (max-width: 768px) {
    left: ${(props) => (props.isOpen ? '0' : '-250px')};
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    margin-bottom: 0.5rem;
  }

  a {
    display: block;
    padding: 0.75rem 1.5rem;
    color: white;
    text-decoration: none;
    font-size: 1.1rem;
    &:hover {
      background-color: #555;
    }
  }
`;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <StyledSidebar isOpen={isOpen}>
      <ul>
        <li><Link to="/dashboards" onClick={onClose}>Dashboards</Link></li>
        <li><Link to="/data-sources" onClick={onClose}>Data Sources</Link></li>
        <li><Link to="/profile" onClick={onClose}>Profile</Link></li>
      </ul>
    </StyledSidebar>
  );
};

export default Sidebar;