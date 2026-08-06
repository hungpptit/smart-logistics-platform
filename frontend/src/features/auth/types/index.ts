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
  managedFacilities?: Array<{
    id: string;
    facilityName: string;
    facilityCode: string;
  }>;
  staffProfile?: {
    id: string;
    assignedFacilityId: string | null;
    assignedFacility?: {
      id: string;
      facilityName: string;
      facilityCode: string;
    } | null;
    employmentStatus?: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED' | 'DISABLED' | string | null;
  } | null;
  staff?: {
    id: string;
    assignedFacilityId: string | null;
    assignedFacility?: {
      id: string;
      facilityName: string;
      facilityCode: string;
    } | null;
    employmentStatus?: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED' | 'DISABLED' | string | null;
  } | null;
  customerProfile?: {
    id: string;
    customerCode: string;
    fullName: string;
    phone?: string;
    email?: string;
    customerType?: string;
    companyName?: string;
    taxCode?: string;
    addresses?: Array<{
      id: string;
      addressType: string;
      isDefault: boolean;
      contactName?: string;
      contactPhone?: string;
      address?: {
        id: string;
        addressLine1: string;
        wardCode?: string;
        wardRelation?: {
          name: string;
          district?: {
            name: string;
            province?: {
              name: string;
            };
          };
        };
      };
    }>;
  } | null;
  customer?: any;
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
