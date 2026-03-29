```typescript
import { createGlobalStyle } from 'styled-components';

/**
 * Global styles applied across the entire application.
 * Uses `styled-components` `createGlobalStyle` helper.
 */
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
    --text-color: #333;
    --background-color: #f4f7f6;
    --card-background: #ffffff;
    --border-color: #dee2e6;
    --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
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

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 1rem;
    color: var(--dark-color);
  }

  p {
    margin-bottom: 1rem;
  }

  a {
    color: var(--primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  ul {
    list-style: none;
  }

  button, input[type="submit"] {
    display: inline-block;
    background: var(--primary-color);
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;

    &:hover {
      background: darken(var(--primary-color), 10%);
    }

    &:disabled {
      background: var(--secondary-color);
      cursor: not-allowed;
    }
  }

  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  textarea {
    display: block;
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 5px;
    color: #fff;
    font-weight: bold;

    &.success {
      background-color: var(--success-color);
    }

    &.error {
      background-color: var(--danger-color);
    }

    &.warning {
      background-color: var(--warning-color);
      color: var(--dark-color);
    }
  }
`;

export default GlobalStyles;
```