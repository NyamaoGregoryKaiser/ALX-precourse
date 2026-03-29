export interface IUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload extends ILoginPayload {
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface IAuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  login: (credentials: ILoginPayload) => Promise<IUser>;
  register: (userData: IRegisterPayload) => Promise<IUser>;
  logout: () => Promise<void>;
  updateProfile: (updateData: Partial<IUser>) => Promise<IUser | undefined>;
}

export interface IProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
```