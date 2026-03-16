import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    --background-color: #f4f7f6;
    --text-color: #333;
    --border-color: #dee2e6;
    --card-background: #fff;
    --header-height: 60px;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
  }

  #root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  a {
    color: var(--primary-color);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  button {
    cursor: pointer;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    transition: background-color 0.2s ease-in-out;

    &.primary {
      background-color: var(--primary-color);
      color: white;
      &:hover {
        background-color: #0056b3;
      }
    }

    &.secondary {
      background-color: var(--secondary-color);
      color: white;
      &:hover {
        background-color: #545b62;
      }
    }

    &.danger {
      background-color: var(--danger-color);
      color: white;
      &:hover {
        background-color: #bd2130;
      }
    }

    &:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  }

  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    font-size: 1rem;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 1rem;
    color: var(--dark-color);
  }

  p {
    margin-bottom: 1rem;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .card {
    background-color: var(--card-background);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
  }
`;

export default GlobalStyles;