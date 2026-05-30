const TOKEN_KEY = 'authTokens';

export const setAuthTokens = (tokens) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const getAuthTokens = () => {
  const tokens = localStorage.getItem(TOKEN_KEY);
  return tokens ? JSON.parse(tokens) : null;
};

export const removeAuthTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
};