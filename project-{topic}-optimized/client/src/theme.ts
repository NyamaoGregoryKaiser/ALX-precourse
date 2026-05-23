import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    900: '#1A202C', // Dark blue/grey
    800: '#2D3748', // Medium dark blue/grey
    700: '#4A5568', // Light dark blue/grey
    600: '#718096', // Even lighter dark blue/grey
    500: '#8A42EA', // A vibrant purple for primary actions
    400: '#9F5CF7', // Lighter purple
    300: '#B87FFF', // Even lighter purple
    200: '#D6AEFF', // Pastel purple
    100: '#F1E4FF', // Very light purple
  },
};

const theme = extendTheme({ colors });

export default theme;
```