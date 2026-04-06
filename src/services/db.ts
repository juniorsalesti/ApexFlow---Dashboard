import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collections
const clientsCol = 'clients';
const contractsCol = 'contracts';
const projectsCol = 'projects';
const financialCol = 'financial';
const commercialCol = 'commercial';
const leadsCol = 'leads';
const companiesCol = 'companies';
const tasksCol = 'tasks';

// CRUD for Companies
export const subscribeCompanies = (callback: (data: any[]) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  const q = query(collection(db, companiesCol), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, companiesCol));
};

export const addCompany = async (data: any) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, companiesCol), { 
      ...data, 
      userId, 
      createdAt: new Date().toISOString() 
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, companiesCol);
  }
};

export const updateCompany = async (id: string, data: any) => {
  try {
    const docRef = doc(db, companiesCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, companiesCol);
  }
};

export const deleteCompany = async (id: string) => {
  try {
    const docRef = doc(db, companiesCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, companiesCol);
  }
};

// CRUD for Clients
export const subscribeClients = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, clientsCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, clientsCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, clientsCol));
};

export const addClient = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, clientsCol), { ...data, userId, companyId, joinedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, clientsCol);
  }
};

export const updateClient = async (id: string, data: any) => {
  try {
    const docRef = doc(db, clientsCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, clientsCol);
  }
};

export const deleteClient = async (id: string) => {
  try {
    const docRef = doc(db, clientsCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, clientsCol);
  }
};

// CRUD for Projects
export const subscribeProjects = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, projectsCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, projectsCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, projectsCol));
};

export const addProject = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, projectsCol), { ...data, userId, companyId, startDate: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, projectsCol);
  }
};

export const updateProject = async (id: string, data: any) => {
  try {
    const docRef = doc(db, projectsCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, projectsCol);
  }
};

// CRUD for Contracts
export const subscribeContracts = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, contractsCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, contractsCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, contractsCol));
};

export const addContract = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, contractsCol), { ...data, userId, companyId, startDate: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, contractsCol);
  }
};

// CRUD for Financial
export const subscribeFinancial = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, financialCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, financialCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, financialCol));
};

export const addFinancialEntry = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, financialCol), { 
      ...data, 
      userId, 
      companyId, 
      date: data.date || new Date().toISOString() 
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, financialCol);
  }
};

export const updateFinancialEntry = async (id: string, data: any) => {
  try {
    const docRef = doc(db, financialCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, financialCol);
  }
};

export const deleteFinancialEntry = async (id: string) => {
  try {
    const docRef = doc(db, financialCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, financialCol);
  }
};

// CRUD for Commercial
export const subscribeCommercial = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, commercialCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, commercialCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, commercialCol));
};

export const addCommercialStats = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, commercialCol), { ...data, userId, companyId, date: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, commercialCol);
  }
};

// CRUD for Leads
export const subscribeLeads = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, leadsCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, leadsCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, leadsCol));
};

export const addLead = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, leadsCol), { 
      ...data, 
      userId, 
      companyId,
      createdAt: new Date().toISOString() 
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, leadsCol);
  }
};

export const updateLead = async (id: string, data: any) => {
  try {
    const docRef = doc(db, leadsCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, leadsCol);
  }
};

export const deleteLead = async (id: string) => {
  try {
    const docRef = doc(db, leadsCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, leadsCol);
  }
};

// CRUD for Tasks
export const subscribeTasks = (callback: (data: any[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  let q = query(collection(db, tasksCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, tasksCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, tasksCol));
};

export const addTask = async (data: any, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  try {
    return await addDoc(collection(db, tasksCol), { 
      ...data, 
      userId, 
      companyId,
      createdAt: new Date().toISOString() 
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, tasksCol);
  }
};

export const updateTask = async (id: string, data: any) => {
  try {
    const docRef = doc(db, tasksCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, tasksCol);
  }
};

export const deleteTask = async (id: string) => {
  try {
    const docRef = doc(db, tasksCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, tasksCol);
  }
};
