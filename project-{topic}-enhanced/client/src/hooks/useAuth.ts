import { useContext } from 'react';
import AuthContext from '@/contexts/AuthContext';
import { IAuthContext } from '@/types/auth.d';

export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};