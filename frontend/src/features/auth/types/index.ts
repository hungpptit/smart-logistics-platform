export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt?: string;
  createdAt: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: User;
}

export interface ValidationErrorConstraint {
  [key: string]: string;
}

export interface ValidationErrorItem {
  target: any;
  property: string;
  value: any;
  constraints: string[];
  field?: string; // normalized path field
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: ValidationErrorItem[];
}
