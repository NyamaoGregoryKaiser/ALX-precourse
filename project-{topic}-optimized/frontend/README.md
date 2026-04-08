# Frontend Client (React)

This directory contains the React client application for the Enterprise-Grade API Development System. It provides a simple user interface to interact with the backend API.

## Features

*   User Registration and Login.
*   Display a list of products.
*   View individual product details.
*   Create and Edit products (requires authentication).
*   Delete products (requires authentication and ownership/admin role).
*   Basic navigation and conditional rendering based on authentication state and user roles.

## Setup

Please refer to the [main project README](../../README.md) for detailed setup and installation instructions.

## Available Scripts

In the `frontend` directory, you can run:

*   `npm start`: Runs the app in development mode.
    Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
    The page will reload when you make changes.
    You may also see any lint errors in the console.

*   `npm test`: Launches the test runner in the interactive watch mode.
    See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

*   `npm run build`: Builds the app for production to the `build` folder.
    It correctly bundles React in production mode and optimizes the build for the best performance.
    The build is minified and the filenames include the hashes.
    Your app is ready to be deployed!

    See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

*   `npm run eject`: **Note: this is a one-way operation. Once you `eject`, you can't go back!**
    If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.
    Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc.) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

## Environment Variables

The following environment variables are used. See `.env.example` for details.

*   `REACT_APP_API_BASE_URL`: The base URL of the backend API (e.g., `http://localhost:5000/api/v1`).
```