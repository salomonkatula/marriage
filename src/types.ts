export type GuestStatus = 'invited' | 'confirmed' | 'not_attending' | 'arrived';

export interface Guest {
  id: string;
  docId?: string; // Firestore Document ID
  name: string;
  email?: string;
  phone?: string;
  status: GuestStatus;
  plusOnes: number;
  arrivalTime?: string;
  checkInTime?: string;
  lastUpdated: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
