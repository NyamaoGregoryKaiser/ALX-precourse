```typescript
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300,400,700&display=swap');

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Roboto', sans-serif;
    line-height: 1.6;
    background-color: #eef2f6; /* Light gray-blue background */
    color: #333;
    overflow-y: hidden; /* Prevent body scroll, let specific components scroll */
  }

  html, #root {
    height: 100%;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  button {
    font-family: 'Roboto', sans-serif;
  }

  /* Basic form element reset */
  input,
  button,
  textarea,
  select {
    font-family: inherit;
    font-size: inherit;
  }

  h1, h2, h3, h4, h5, h6 {
    line-height: 1.2;
    margin-bottom: 0.5em;
  }
`;

export default GlobalStyles;
```