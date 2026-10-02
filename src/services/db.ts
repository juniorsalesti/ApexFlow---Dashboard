import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  query, 
  where, 
  onSnapshot,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Process, Onboarding, Service, ClientService, Task, TaskGenerationResult, BatchTaskGenerationResult } from '../types';

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
const processesCol = 'processes';
const onboardingsCol = 'onboardings';
const servicesCol = 'services';
const clientServicesCol = 'clientServices';

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
    return await addDoc(collection(db, projectsCol), { 
      ...data, 
      userId, 
      companyId, 
      startDate: data.startDate || new Date().toISOString() 
    });
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

export const deleteProject = async (id: string) => {
  try {
    const docRef = doc(db, projectsCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, projectsCol);
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

export const updateContract = async (id: string, data: any) => {
  try {
    const docRef = doc(db, contractsCol, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, contractsCol);
  }
};

export const deleteContract = async (id: string) => {
  try {
    const docRef = doc(db, contractsCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, contractsCol);
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

export interface GenerateTasksFromProcessParams {
  clientId: string;
  serviceId: string;
  serviceName?: string;
  processId: string;
  companyId: string;
}

export const generateTasksFromProcess = async ({
  clientId,
  serviceId,
  serviceName,
  processId,
  companyId
}: GenerateTasksFromProcessParams): Promise<TaskGenerationResult> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Usuário não autenticado');
  if (!companyId) throw new Error('Company ID é obrigatório');
  if (!clientId) throw new Error('Client ID é obrigatório');
  if (!processId) throw new Error('Process ID é obrigatório');

  // 1. Fetch Process from processes collection
  const processDocRef = doc(db, processesCol, processId);
  const processSnap = await getDoc(processDocRef);
  if (!processSnap.exists()) {
    throw new Error('Processo não encontrado na biblioteca.');
  }

  const processData = { id: processSnap.id, ...processSnap.data() } as Process;

  // 2. Check if process is active
  if (processData.active === false) {
    throw new Error('Este processo está inativo e não pode gerar tarefas.');
  }

  // 3. Filter and sort active steps
  const activeSteps = (processData.steps || [])
    .filter(s => (s.active ?? true))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (activeSteps.length === 0) {
    return {
      created: 0,
      skipped: 0,
      duplicated: 0,
      message: 'Este processo não possui etapas ativas para geração.'
    };
  }

  // 4. Fetch existing tasks for this client to ensure IDEMPOTENCE
  const tasksQuery = query(
    collection(db, tasksCol),
    where('userId', '==', userId),
    where('companyId', '==', companyId),
    where('clientId', '==', clientId)
  );

  const existingTasksSnap = await getDocs(tasksQuery);
  const existingTasks = existingTasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  // Weekday names helper for the kanban
  const WEEKDAYS = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  let createdCount = 0;
  let skippedCount = 0;
  const now = new Date();

  // 5. Iterate through active steps and create only non-duplicate tasks
  for (let i = 0; i < activeSteps.length; i++) {
    const step = activeSteps[i];

    // Check if task was already generated for this process and step
    const alreadyExists = existingTasks.some(existing => {
      if (existing.processId === processId) {
        if (existing.processStepId && existing.processStepId === step.id) return true;
        if (existing.processStepOrder && existing.processStepOrder === (step.order || (i + 1))) return true;
        if (existing.title && existing.title.trim().toLowerCase() === step.title.trim().toLowerCase()) return true;
      }
      return false;
    });

    if (alreadyExists) {
      skippedCount++;
      continue;
    }

    // Sequential due date starting today
    const taskDate = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
    const dueDateStr = taskDate.toISOString().split('T')[0];
    const jsDay = taskDate.getDay(); // 0 is Sunday, 1 is Monday...
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const weekday = WEEKDAYS[dayIndex] || 'Segunda-feira';

    let taskDesc = step.description ? step.description.trim() : '';
    if (step.checklist && step.checklist.length > 0) {
      const checklistText = step.checklist.map(item => `• ${item}`).join('\n');
      taskDesc = taskDesc 
        ? `${taskDesc}\n\nChecklist:\n${checklistText}` 
        : `Checklist:\n${checklistText}`;
    }

    const newTaskDoc = {
      title: step.title.trim(),
      description: taskDesc,
      status: 'a fazer',
      priority: 'média',
      clientId,
      serviceId: serviceId || processData.serviceId || '',
      serviceName: serviceName || processData.serviceName || '',
      processId: processData.id,
      processTitle: processData.title,
      processStepId: step.id,
      processStepOrder: step.order || (i + 1),
      processStepTitle: step.title.trim(),
      source: 'process',
      responsibleRole: step.responsibleRole || '',
      responsible: step.responsibleRole || 'Equipe',
      date: weekday,
      deadline: dueDateStr,
      dueDate: dueDateStr,
      companyId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await addDoc(collection(db, tasksCol), newTaskDoc);
    createdCount++;
  }

  return {
    created: createdCount,
    skipped: skippedCount,
    duplicated: skippedCount,
    message: createdCount > 0 
      ? `${createdCount} tarefa(s) criada(s) com sucesso.${skippedCount > 0 ? ` (${skippedCount} já existiam e foram ignoradas)` : ''}`
      : 'Este processo já possui tarefas geradas para este cliente.'
  };
};

export interface ProcessBatchItem {
  processId: string;
  processTitle?: string;
  serviceId?: string;
  serviceName?: string;
}

export const generateTasksForMultipleProcesses = async ({
  clientId,
  companyId,
  processesToGenerate
}: {
  clientId: string;
  companyId: string;
  processesToGenerate: ProcessBatchItem[];
}): Promise<BatchTaskGenerationResult> => {
  let totalCreated = 0;
  let totalSkipped = 0;
  const results: BatchTaskGenerationResult['results'] = [];

  for (const item of processesToGenerate) {
    try {
      const singleResult = await generateTasksFromProcess({
        clientId,
        companyId,
        processId: item.processId,
        serviceId: item.serviceId || '',
        serviceName: item.serviceName || ''
      });

      totalCreated += singleResult.created;
      totalSkipped += singleResult.skipped;
      results.push({
        processId: item.processId,
        processTitle: item.processTitle || item.processId,
        serviceName: item.serviceName,
        created: singleResult.created,
        skipped: singleResult.skipped
      });
    } catch (err: any) {
      console.warn(`Error generating tasks for process ${item.processId}:`, err);
    }
  }

  return {
    totalCreated,
    totalSkipped,
    results,
    message: totalCreated > 0
      ? `${totalCreated} tarefa(s) gerada(s) com sucesso.${totalSkipped > 0 ? ` (${totalSkipped} etapas já existiam e foram preservadas)` : ''}`
      : `Todas as tarefas dos processos selecionados já haviam sido geradas anteriormente para este cliente.`
  };
};

// CRUD for Processes (SOPs)
export const subscribeProcesses = (callback: (data: Process[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  let q = query(collection(db, processesCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, processesCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Process[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, processesCol));
};

export const addProcess = async (
  data: Omit<Process, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'companyId'> & { companyId?: string }, 
  companyId: string
) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');

  const now = new Date().toISOString();
  try {
    return await addDoc(collection(db, processesCol), {
      ...data,
      companyId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, processesCol);
  }
};

export const updateProcess = async (id: string, data: Partial<Process>) => {
  try {
    const docRef = doc(db, processesCol, id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, processesCol);
  }
};

export const deleteProcess = async (id: string) => {
  try {
    const docRef = doc(db, processesCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, processesCol);
  }
};

export const duplicateProcess = async (process: Process, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');

  const now = new Date().toISOString();
  const clonedSteps = (process.steps || []).map((step, idx) => ({
    ...step,
    id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    checklist: Array.isArray(step.checklist) ? [...step.checklist] : []
  }));

  try {
    return await addDoc(collection(db, processesCol), {
      title: `${process.title} - Cópia`,
      description: process.description || '',
      category: process.category || 'geral',
      department: process.department || '',
      serviceId: process.serviceId || '',
      serviceName: process.serviceName || '',
      content: process.content || '',
      steps: clonedSteps,
      active: process.active ?? true,
      companyId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, processesCol);
  }
};

// CRUD for Onboardings
export const subscribeOnboardings = (
  callback: (data: Onboarding[]) => void, 
  companyId?: string | null, 
  clientId?: string | null
) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  let q = query(collection(db, onboardingsCol), where('userId', '==', userId));
  if (companyId && clientId) {
    q = query(collection(db, onboardingsCol), where('userId', '==', userId), where('companyId', '==', companyId), where('clientId', '==', clientId));
  } else if (companyId) {
    q = query(collection(db, onboardingsCol), where('userId', '==', userId), where('companyId', '==', companyId));
  } else if (clientId) {
    q = query(collection(db, onboardingsCol), where('userId', '==', userId), where('clientId', '==', clientId));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Onboarding[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, onboardingsCol));
};

export const addOnboarding = async (data: Omit<Onboarding, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');
  if (!data.clientId) throw new Error('Client ID is required');

  const now = new Date().toISOString();
  try {
    return await addDoc(collection(db, onboardingsCol), {
      ...data,
      companyId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, onboardingsCol);
  }
};

export const updateOnboarding = async (id: string, data: Partial<Onboarding>) => {
  try {
    const docRef = doc(db, onboardingsCol, id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, onboardingsCol);
  }
};

export const deleteOnboarding = async (id: string) => {
  try {
    const docRef = doc(db, onboardingsCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, onboardingsCol);
  }
};

// CRUD for Services
export const DEFAULT_APEXFLOW_SERVICES = [
  { name: 'Gestão de Tráfego', category: 'trafego', description: 'Gestão de campanhas e anúncios de tráfego pago.' },
  { name: 'Gestão de Redes Sociais', category: 'social_media', description: 'Gestão de presença, calendário e conteúdo para redes sociais.' },
  { name: 'Criação de Artes', category: 'criativos', description: 'Design de peças visuais, banners e identidade gráfica.' },
  { name: 'Criação de Criativos', category: 'criativos', description: 'Produção de criativos de alta conversão para campanhas.' },
  { name: 'Criação de Sites', category: 'sites', description: 'Desenvolvimento e estruturação de websites institucionais.' },
  { name: 'Criação de Landing Pages', category: 'landing_pages', description: 'Criação de páginas de captura e de vendas focadas em conversão.' },
  { name: 'SEO', category: 'seo', description: 'Otimização para motores de busca e posicionamento orgânico.' },
  { name: 'Automação', category: 'automacao', description: 'Automações de fluxos de marketing, CRM e processos operacionais.' },
  { name: 'Hospedagem', category: 'hospedagem', description: 'Hospedagem de sites, manutenção de servidores e certificados SSL.' },
  { name: 'Outros', category: 'geral', description: 'Outros serviços e soluções personalizadas sob demanda.' },
];

export const subscribeServices = (callback: (data: Service[]) => void, companyId?: string | null) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  let q = query(collection(db, servicesCol), where('userId', '==', userId));
  if (companyId) {
    q = query(collection(db, servicesCol), where('userId', '==', userId), where('companyId', '==', companyId));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, servicesCol));
};

export const addService = async (data: Omit<Service, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');

  const now = new Date().toISOString();
  try {
    return await addDoc(collection(db, servicesCol), {
      ...data,
      companyId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, servicesCol);
  }
};

export const updateService = async (id: string, data: Partial<Service>) => {
  try {
    const docRef = doc(db, servicesCol, id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, servicesCol);
  }
};

export const deleteService = async (id: string) => {
  try {
    const docRef = doc(db, servicesCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, servicesCol);
  }
};

export const seedDefaultServices = async (companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');

  try {
    // 1. Check existing services to guarantee idempotence & prevent duplicates
    const q = query(
      collection(db, servicesCol),
      where('userId', '==', userId),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const existingNames = new Set(
      snapshot.docs.map(d => (d.data().name || '').trim().toLowerCase())
    );

    const createdServices = [];
    const now = new Date().toISOString();

    for (const def of DEFAULT_APEXFLOW_SERVICES) {
      if (!existingNames.has(def.name.trim().toLowerCase())) {
        const docRef = await addDoc(collection(db, servicesCol), {
          name: def.name,
          category: def.category,
          description: def.description,
          active: true,
          companyId,
          userId,
          createdAt: now,
          updatedAt: now
        });
        createdServices.push({ id: docRef.id, name: def.name });
      }
    }
    return createdServices;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, servicesCol);
  }
};

// CRUD for ClientServices
export const subscribeClientServices = (
  callback: (data: ClientService[]) => void, 
  companyId?: string | null,
  clientId?: string | null
) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  let q = query(collection(db, clientServicesCol), where('userId', '==', userId));
  if (companyId && clientId) {
    q = query(collection(db, clientServicesCol), where('userId', '==', userId), where('companyId', '==', companyId), where('clientId', '==', clientId));
  } else if (companyId) {
    q = query(collection(db, clientServicesCol), where('userId', '==', userId), where('companyId', '==', companyId));
  } else if (clientId) {
    q = query(collection(db, clientServicesCol), where('userId', '==', userId), where('clientId', '==', clientId));
  }

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClientService[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, clientServicesCol));
};

export const addClientService = async (data: Omit<ClientService, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  if (!companyId) throw new Error('Company ID is required');
  if (!data.clientId) throw new Error('Client ID is required');
  if (!data.serviceId) throw new Error('Service ID is required');

  const now = new Date().toISOString();
  try {
    return await addDoc(collection(db, clientServicesCol), {
      ...data,
      companyId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, clientServicesCol);
  }
};

export const updateClientService = async (id: string, data: Partial<ClientService>) => {
  try {
    const docRef = doc(db, clientServicesCol, id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, clientServicesCol);
  }
};

export const deleteClientService = async (id: string) => {
  try {
    const docRef = doc(db, clientServicesCol, id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, clientServicesCol);
  }
};

// Default Processes Template for ApexFlow OS
export const DEFAULT_APEXFLOW_PROCESSES = [
  {
    title: 'Onboarding Geral de Novo Cliente',
    category: 'onboarding',
    department: 'Atendimento / Operações',
    description: 'Processo padrão de boas-vindas, alinhamento contratual e kick-off operacional.',
    content: 'Guia mestre para integração e estruturação inicial de qualquer novo cliente da ApexFlow.',
    serviceName: 'Geral',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Confirmar contrato',
        description: 'Verificar assinatura formal e conferir termos contratados.',
        checklist: ['Verificar assinatura do contrato', 'Validar dados cadastrais', 'Arquivar via assinada'],
        estimatedMinutes: 15,
        responsibleRole: 'Operações',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Confirmar pagamento inicial',
        description: 'Comprovar compensação do pagamento de entrada ou primeira mensalidade.',
        checklist: ['Verificar comprovante', 'Emitir NF inicial', 'Validar conciliação bancária'],
        estimatedMinutes: 15,
        responsibleRole: 'Financeiro',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Criar/validar cadastro do cliente',
        description: 'Conferir dados no sistema, contatos principais e decisores.',
        checklist: ['Preencher ficha cadastral', 'Verificar contatos principais', 'Conferir segmento de atuação'],
        estimatedMinutes: 20,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Identificar serviços contratados',
        description: 'Mapear escopo de serviços e definir equipe técnica de atendimento.',
        checklist: ['Listar escopo fechado', 'Definir responsáveis por serviço', 'Alinhar prazos e expectativas'],
        estimatedMinutes: 20,
        responsibleRole: 'Gerente de Contas',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Solicitar informações e acessos',
        description: 'Enviar formulário de briefing e orientações de liberação de permissões.',
        checklist: ['Enviar formulário de briefing', 'Solicitar acessos às ferramentas', 'Confirmar recebimento de senhas'],
        estimatedMinutes: 30,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Criar canais de comunicação',
        description: 'Criar grupos dedicados e apresentar equipe ao cliente.',
        checklist: ['Criar grupo no WhatsApp/Slack', 'Apresentar equipe ao cliente', 'Enviar mensagem de boas-vindas'],
        estimatedMinutes: 20,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Criar estrutura interna do cliente',
        description: 'Organizar pastas em nuvem, repositório de arquivos e templates.',
        checklist: ['Criar pasta no Drive', 'Configurar workspace interno', 'Organizar repositório de arquivos'],
        estimatedMinutes: 30,
        responsibleRole: 'Operações',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Confirmar início da operação',
        description: 'Realizar reunião de kick-off e agendar primeira entrega.',
        checklist: ['Realizar reunião de kick-off', 'Registrar ata de alinhamento', 'Agendar primeira entrega'],
        estimatedMinutes: 45,
        responsibleRole: 'Gerente de Projetos',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Onboarding de Gestão de Tráfego',
    category: 'trafego',
    department: 'Mídia & Performance',
    description: 'Configuração completa de contas de anúncios, pixels e estrutura estratégica.',
    content: 'Procedimento operacional padrão para ativação de campanhas de tráfego pago.',
    serviceName: 'Gestão de Tráfego',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Levantamento de informações',
        description: 'Mapear histórico de anúncios, orçamento e público-alvo pretendido.',
        checklist: ['Histórico de anúncios', 'Investimento mensal pretendido', 'Público-alvo e personas'],
        estimatedMinutes: 30,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Solicitação de acessos',
        description: 'Receber permissões em Meta BM, Google Ads, GA4 e GTM.',
        checklist: ['Meta Business Manager', 'Google Ads', 'Google Analytics 4', 'Google Tag Manager'],
        estimatedMinutes: 30,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Validação do Meta Business',
        description: 'Checar BM da empresa, formas de pagamento e status da conta.',
        checklist: ['Verificar BM da empresa', 'Vincular forma de pagamento', 'Checar status da conta de anúncios'],
        estimatedMinutes: 25,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Validação do Instagram/Facebook',
        description: 'Conectar páginas, verificar permissões e 2FA.',
        checklist: ['Conectar página do Facebook ao Instagram', 'Validar permissões de anunciante', 'Conferir autenticação de dois fatores'],
        estimatedMinutes: 20,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Validação do Google Ads',
        description: 'Conferir faturamento, saldo e conexões de contas.',
        checklist: ['Conferir ID da conta', 'Validar faturamento e saldo', 'Vincular com canal do YouTube se houver'],
        estimatedMinutes: 20,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Configuração de Pixel/Tags',
        description: 'Instalar tags de conversão e API de Conversões Meta.',
        checklist: ['Instalar Pixel Meta no site', 'Configurar API de Conversões', 'Instalar Tag do Google Ads', 'Configurar eventos de conversão'],
        estimatedMinutes: 45,
        responsibleRole: 'Especialista em Tracking',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Definição de objetivos',
        description: 'Definir metas de leads/vendas e CPA/ROAS aceitáveis.',
        checklist: ['Definir CPA e ROAS almejados', 'Definir meta de leads ou vendas', 'Estabelecer KPIs principais'],
        estimatedMinutes: 30,
        responsibleRole: 'Estratégia',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Planejamento da campanha',
        description: 'Estruturação do funil de tráfego, orçamentos e ganchos.',
        checklist: ['Estrutura de topo, meio e fundo de funil', 'Definição de orçamento diário por conjunto', 'Rascunho de copies e ângulos'],
        estimatedMinutes: 40,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Criação dos públicos',
        description: 'Subir públicos de remarketing, lookalikes e interesses.',
        checklist: ['Públicos personalizados de remarketing', 'Públicos semelhantes (Lookalike)', 'Públicos de interesses e comportamentos'],
        estimatedMinutes: 35,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Configuração das campanhas',
        description: 'Subir criativos, copies, URLs com UTMs e parametrização.',
        checklist: ['Subir criativos e copies', 'Parametrizar URLs com UTMs', 'Configurar orçamento e lances'],
        estimatedMinutes: 60,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-11',
        order: 11,
        title: 'Revisão interna',
        description: 'Double check de links de destino, orçamento e ortografia.',
        checklist: ['Double check de links de destino', 'Conferir orçamento e datas', 'Verificar ortografia das copies'],
        estimatedMinutes: 20,
        responsibleRole: 'Coordenador de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-12',
        order: 12,
        title: 'Publicação',
        description: 'Ativação das campanhas nas plataformas.',
        checklist: ['Ativar campanhas', 'Verificar se entraram em análise', 'Confirmar primeira impressão'],
        estimatedMinutes: 15,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      },
      {
        id: 'step-13',
        order: 13,
        title: 'Monitoramento inicial',
        description: 'Acompanhar primeiras 24 horas e validar disparo de conversões.',
        checklist: ['Acompanhar primeiras 24 horas', 'Checar disparo de conversões', 'Garantir entrega sem reprovações'],
        estimatedMinutes: 30,
        responsibleRole: 'Gestor de Tráfego',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Onboarding de Gestão de Redes Sociais',
    category: 'social_media',
    department: 'Criação & Conteúdo',
    description: 'Imersão na marca, calendário editorial e alinhamento de linhas de conteúdo.',
    content: 'Processo padrão de início de gestão de redes sociais.',
    serviceName: 'Gestão de Redes Sociais',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Coleta de informações da marca',
        description: 'Imersão no tom de voz, persona e identidade da marca.',
        checklist: ['Tom de voz da marca', 'Manual de identidade visual', 'Valores e restrições'],
        estimatedMinutes: 30,
        responsibleRole: 'Social Media',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Definição de posicionamento',
        description: 'Estruturação dos pilares de conteúdo e mensagem central.',
        checklist: ['Linhas editoriais principais', 'Pilares de conteúdo', 'Proposta de valor no feed'],
        estimatedMinutes: 45,
        responsibleRole: 'Estrategista de Conteúdo',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Levantamento de referências',
        description: 'Pesquisa de benchmarks e montagem de moodboard visual.',
        checklist: ['Pesquisa de concorrentes diretos', 'Tendências do segmento', 'Moodboard visual'],
        estimatedMinutes: 40,
        responsibleRole: 'Designer / Social Media',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Definição de calendário',
        description: 'Frequência de postagens e datas especiais.',
        checklist: ['Frequência semanal de posts', 'Melhores dias e horários', 'Datas comemorativas relevantes'],
        estimatedMinutes: 30,
        responsibleRole: 'Social Media',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Planejamento de conteúdo',
        description: 'Roteiros de postagens e direcionamento de arte.',
        checklist: ['Títulos e roteiros dos posts', 'Formatos (carrossel, reels, estático)', 'Direcionamento visual'],
        estimatedMinutes: 60,
        responsibleRole: 'Copywriter / Social Media',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Produção',
        description: 'Redação das legendas, artes gráficas e edição de vídeos.',
        checklist: ['Redação das legendas', 'Criação das artes e cards', 'Edição de vídeos/reels'],
        estimatedMinutes: 90,
        responsibleRole: 'Designer / Copywriter',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Revisão',
        description: 'Revisão ortográfica e conformidade de marca.',
        checklist: ['Revisão ortográfica e gramatical', 'Checagem com manual de marca', 'Validação de links e hashtags'],
        estimatedMinutes: 20,
        responsibleRole: 'Coordenador de Conteúdo',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Aprovação',
        description: 'Apresentação do calendário ao cliente para homologação.',
        checklist: ['Apresentar calendário ao cliente', 'Registrar feedback', 'Efetuar ajustes solicitados'],
        estimatedMinutes: 30,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Publicação',
        description: 'Agendamento e postagem nas redes sociais.',
        checklist: ['Agendar postagens nas plataformas', 'Configurar legendas e capas', 'Testar links na bio'],
        estimatedMinutes: 25,
        responsibleRole: 'Social Media',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Monitoramento',
        description: 'Interação com a comunidade e análise inicial.',
        checklist: ['Acompanhar engajamento inicial', 'Responder comentários e DMs', 'Coletar métricas preliminares'],
        estimatedMinutes: 30,
        responsibleRole: 'Social Media',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Produção de Arte ou Criativo',
    category: 'criativos',
    department: 'Design',
    description: 'Fluxo completo de criação e aprovação de peças gráficas e criativos de anúncios.',
    content: 'Padrão operacional de design e entrega visual.',
    serviceName: 'Criação de Artes',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Receber briefing',
        description: 'Validar pedido, objetivos e prazo da peça gráfica.',
        checklist: ['Conferir informações do pedido', 'Entender objetivo da peça', 'Verificar prazo de entrega'],
        estimatedMinutes: 15,
        responsibleRole: 'Designer',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Validar objetivo da peça',
        description: 'Identificar se a peça é voltada a branding ou conversão.',
        checklist: ['Identificar persona destinatária', 'Entender se é branding ou conversão', 'Checar canal de veiculação'],
        estimatedMinutes: 15,
        responsibleRole: 'Diretor de Arte',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Definir formato',
        description: 'Estabelecer dimensões e formatos de exportação.',
        checklist: ['Dimensões exatas (1:1, 9:16, 16:9)', 'Formato de exportação (PNG, MP4, PDF)', 'Regras da plataforma'],
        estimatedMinutes: 10,
        responsibleRole: 'Designer',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Criar conceito',
        description: 'Estruturação da ideia visual, tipografia e cores.',
        checklist: ['Esboçar layout e hierarquia visual', 'Definir paleta e tipografia', 'Selecionar elementos visuais'],
        estimatedMinutes: 30,
        responsibleRole: 'Designer',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Produzir peça',
        description: 'Execução do design com alto padrão estético.',
        checklist: ['Compor arte no software gráfico', 'Aplicar logotipo e cores institucionais', 'Inserir copy com alto contraste'],
        estimatedMinutes: 60,
        responsibleRole: 'Designer',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Revisão interna',
        description: 'Checagem de alinhamentos, contraste e ortografia.',
        checklist: ['Checar alinhamentos e margens', 'Revisar texto e legibilidade', 'Garantir qualidade de resolução'],
        estimatedMinutes: 15,
        responsibleRole: 'Diretor de Arte',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Enviar para aprovação',
        description: 'Envio de prévia para o cliente com contextualização.',
        checklist: ["Enviar prévia com marca d'água", 'Contextualizar decisões criativas', 'Aguardar retorno do cliente'],
        estimatedMinutes: 10,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Ajustes',
        description: 'Execução de modificações pontuais solicitadas pelo cliente.',
        checklist: ['Analisar apontamentos do cliente', 'Executar modificações solicitadas', 'Conferir se nada quebrou'],
        estimatedMinutes: 30,
        responsibleRole: 'Designer',
        required: false,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Aprovação final',
        description: 'Confirmação formal de aprovação da peça.',
        checklist: ['Obter aprovação formal por escrito', 'Marcar status como aprovado'],
        estimatedMinutes: 10,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Entrega',
        description: 'Exportação final em alta qualidade e disponibilização.',
        checklist: ['Exportar arquivos em alta definição', 'Disponibilizar link no Drive', 'Notificar equipe responsável'],
        estimatedMinutes: 15,
        responsibleRole: 'Designer',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Criação de Site',
    category: 'sites',
    department: 'Desenvolvimento Web',
    description: 'Processo completo de desenvolvimento de websites institucionais e portais.',
    content: 'Metodologia padrão de criação e lançamento de sites.',
    serviceName: 'Criação de Sites',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Briefing',
        description: 'Levantamento de requisitos, benchmarks e funcionalidades.',
        checklist: ['Mapear objetivos do site', 'Definir concorrentes e benchmarks', 'Levantar funcionalidades requeridas'],
        estimatedMinutes: 45,
        responsibleRole: 'Gerente de Projetos',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Levantamento de referências',
        description: 'Pesquisa visual, moodboard e UX referências.',
        checklist: ['Buscar referências visuais e UX', 'Criar moodboard', 'Apresentar referências ao cliente'],
        estimatedMinutes: 40,
        responsibleRole: 'Designer UI/UX',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Estrutura do site',
        description: 'Arquitetura de informação e elaboração de sitemap.',
        checklist: ['Definir arquitetura da informação', 'Elaborar sitemap completo', 'Mapear jornada do usuário'],
        estimatedMinutes: 45,
        responsibleRole: 'Estrategista UX',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Definição de páginas',
        description: 'Estrutura detalhada de seções de cada página.',
        checklist: ['Home, Sobre, Serviços, Contato, etc.', 'Definir seções de cada página', 'Estruturar hierarquia de navegação'],
        estimatedMinutes: 30,
        responsibleRole: 'Designer UI/UX',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Conteúdo',
        description: 'Redação de copy institucional e coleta de materiais.',
        checklist: ['Redigir textos institucionais (Copy)', 'Definir chamadas para ação (CTAs)', 'Coletar imagens e depoimentos reais'],
        estimatedMinutes: 90,
        responsibleRole: 'Copywriter',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Design',
        description: 'Criação do layout e protótipo navegável em alta fidelidade.',
        checklist: ['Desenvolver protótipo navegável (Figma)', 'Definir guia de estilos e componentes', 'Validar design com o cliente'],
        estimatedMinutes: 120,
        responsibleRole: 'Designer UI/UX',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Desenvolvimento',
        description: 'Programação de páginas, componentes e integrações.',
        checklist: ['Configurar ambiente e framework', 'Codificar páginas e componentes', 'Integrar formulários e APIs'],
        estimatedMinutes: 240,
        responsibleRole: 'Desenvolvedor Web',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Responsividade',
        description: 'Adaptação rigorosa para mobile, tablet e desktop.',
        checklist: ['Ajustar visualização mobile', 'Ajustar visualização tablet e desktop', 'Garantir touch amigável'],
        estimatedMinutes: 60,
        responsibleRole: 'Desenvolvedor Web',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'SEO básico',
        description: 'Metatags, alt de imagens, sitemap e robots.txt.',
        checklist: ['Configurar tags Title e Meta Description', 'Otimizar atributos Alt das imagens', 'Configurar sitemap.xml e robots.txt'],
        estimatedMinutes: 45,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Testes',
        description: 'Testes de navegação, formulários e velocidade.',
        checklist: ['Testar envio de formulários e botões', 'Verificar velocidade de carregamento (PageSpeed)', 'Testar compatibilidade em navegadores'],
        estimatedMinutes: 45,
        responsibleRole: 'QA / Desenvolvedor',
        required: true,
        active: true
      },
      {
        id: 'step-11',
        order: 11,
        title: 'Revisão interna',
        description: 'Auditoria de qualidade técnica e ortográfica.',
        checklist: ['Revisar todos os links quebrados', 'Checar ortografia de todos os textos', 'Validar checklist de segurança'],
        estimatedMinutes: 30,
        responsibleRole: 'Líder Técnico',
        required: true,
        active: true
      },
      {
        id: 'step-12',
        order: 12,
        title: 'Aprovação',
        description: 'Apresentação e aprovação final com o cliente.',
        checklist: ['Apresentar versão final homologada', 'Coletar aprovação formal do cliente'],
        estimatedMinutes: 30,
        responsibleRole: 'Gerente de Projetos',
        required: true,
        active: true
      },
      {
        id: 'step-13',
        order: 13,
        title: 'Publicação',
        description: 'Apontamento de domínio, emissão de SSL e deploy final.',
        checklist: ['Apontar domínio e configurar DNS', 'Instalar certificado SSL HTTPS', 'Submeter sitemap ao Google Search Console'],
        estimatedMinutes: 45,
        responsibleRole: 'DevOps / Desenvolvedor',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Criação de Landing Page',
    category: 'landing_pages',
    department: 'Marketing & Conversão',
    description: 'Páginas focadas em conversão direta de leads ou vendas com alto impacto.',
    content: 'Guia de execução de landing pages orientadas a ROI.',
    serviceName: 'Criação de Landing Pages',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Briefing',
        description: 'Identificar produto/serviço ofertado e promessa central.',
        checklist: ['Identificar produto/serviço ofertado', 'Compreender público-alvo prioritário', 'Definir promessa central da página'],
        estimatedMinutes: 30,
        responsibleRole: 'Copywriter / Projetos',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Objetivo da página',
        description: 'Definir meta de conversão e canal de tráfego de entrada.',
        checklist: ['Definir meta (Captura de Lead ou Venda)', 'Estipular taxa de conversão meta', 'Mapear canal de tráfego de entrada'],
        estimatedMinutes: 20,
        responsibleRole: 'Estrategista',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Definição da oferta',
        description: 'Estruturação da Proposta Única de Valor e garantias.',
        checklist: ['Estruturar proposta única de valor (UVP)', 'Mapear benefícios e diferenciais', 'Definir quebra de objeções e garantia'],
        estimatedMinutes: 40,
        responsibleRole: 'Copywriter',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Estrutura da página',
        description: 'Ordem dos blocos de conversão e wireframe.',
        checklist: ['Definir ordem dos blocos (Hero, Dor, Solução, Prova Social, CTA)', 'Wireframe de baixa fidelidade'],
        estimatedMinutes: 35,
        responsibleRole: 'Designer UI/UX',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Copy',
        description: 'Headline de alto impacto e chamadas para ação persuasivas.',
        checklist: ['Headline de alto impacto', 'Textos de suporte envolventes', 'Microcopy dos botões de ação'],
        estimatedMinutes: 60,
        responsibleRole: 'Copywriter',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Design',
        description: 'Layout focado em conversão e destaque nos pontos de clique.',
        checklist: ['Layout visual focado em conversão', 'Garantir contraste excelente nos CTAs', 'Design limpo e moderno'],
        estimatedMinutes: 90,
        responsibleRole: 'Designer UI/UX',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Desenvolvimento',
        description: 'Construção rápida, limpa e responsiva.',
        checklist: ['Construção do código ou construtor', 'Garantir carregamento ultra-rápido', 'Otimização de imagens'],
        estimatedMinutes: 90,
        responsibleRole: 'Desenvolvedor Web',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Formulário/CTA',
        description: 'Integração de captura de leads e redirecionamento.',
        checklist: ['Campos essenciais sem fricção', 'Redirecionamento para página de obrigado', 'Disparo de webhook para CRM'],
        estimatedMinutes: 30,
        responsibleRole: 'Desenvolvedor Web',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Tracking',
        description: 'Pixels, eventos de conversão e rastreamento de cliques.',
        checklist: ['Pixel do Meta com evento Lead', 'Google Tag Manager e Google Analytics', 'Configurar evento de clique no WhatsApp se houver'],
        estimatedMinutes: 35,
        responsibleRole: 'Especialista em Tracking',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Testes',
        description: 'Envio real de formulário e checagem de layout.',
        checklist: ['Teste A/B se aplicável', 'Testar envio real de lead', 'Testar layout em iPhone e Android'],
        estimatedMinutes: 30,
        responsibleRole: 'QA / Desenvolvedor',
        required: true,
        active: true
      },
      {
        id: 'step-11',
        order: 11,
        title: 'Aprovação',
        description: 'Validação final com o cliente.',
        checklist: ['Apresentação do link de preview', 'Aprovação pelo cliente'],
        estimatedMinutes: 20,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-12',
        order: 12,
        title: 'Publicação',
        description: 'Lançamento oficial no domínio de campanha.',
        checklist: ['Publicar no domínio oficial', 'Verificar certificado de segurança', 'Confirmar disparo para equipe de tráfego'],
        estimatedMinutes: 20,
        responsibleRole: 'Desenvolvedor Web',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Implantação Inicial de SEO',
    category: 'seo',
    department: 'Performance Orgânica',
    description: 'Auditoria técnica, mapeamento de palavras-chave e otimizações on-page.',
    content: 'Checklist padrão de lançamento de estratégia orgânica.',
    serviceName: 'SEO',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Auditoria inicial',
        description: 'Mapear erros 404, status de indexação e saúde técnica.',
        checklist: ['Identificar erros 404 e redirecionamentos', 'Checar status de indexação no Google', 'Avaliar saúde técnica do domínio'],
        estimatedMinutes: 60,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Pesquisa de palavras-chave',
        description: 'Identificar oportunidades de busca com alta relevância.',
        checklist: ['Mapear termos de intenção de busca', 'Identificar volume e dificuldade', 'Montar planilha de palavras-chave alvo'],
        estimatedMinutes: 60,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Análise técnica',
        description: 'Core Web Vitals, HTML semântico e arquivos de robô.',
        checklist: ['Velocidade (Core Web Vitals)', 'Estrutura do código HTML', 'Arquivos robots.txt e XML sitemap'],
        estimatedMinutes: 45,
        responsibleRole: 'Desenvolvedor / SEO',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Estrutura de páginas',
        description: 'Arquitetura de URLs e breadcrumbs.',
        checklist: ['Hierarquia de URLs amigáveis', 'Navegação por categorias', 'Breadcrumbs'],
        estimatedMinutes: 30,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Otimização de títulos',
        description: 'Tags title otimizadas com foco no CTR.',
        checklist: ['Escrever tags Title únicas com palavra-chave', 'Manter comprimento até 60 caracteres', 'Incluir marca no final'],
        estimatedMinutes: 40,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Meta descriptions',
        description: 'Descrições atraentes e persuasivas nos resultados de busca.',
        checklist: ['Descrições atrativas com CTA', 'Comprimento entre 140 e 160 caracteres', 'Evitar descrições duplicadas'],
        estimatedMinutes: 40,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'URLs',
        description: 'URLs canônicas, curtas e semânticas.',
        checklist: ['Remover parâmetros desnecessários', 'Utilizar hifens e caixa baixa', 'Garantir URLs canônicas corretas'],
        estimatedMinutes: 30,
        responsibleRole: 'Desenvolvedor / SEO',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Conteúdo',
        description: 'Headings semânticos (H1, H2, H3) e semântica lexical.',
        checklist: ['Otimizar cabeçalhos H1, H2 e H3', 'Adequar densidade de termos sem keyword stuffing', 'Inserir termos semânticos (LSI)'],
        estimatedMinutes: 60,
        responsibleRole: 'Copywriter SEO',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Links internos',
        description: 'Interlinking entre páginas estratégicas.',
        checklist: ['Conectar páginas com textos-âncora relevantes', 'Distribuir autoridade para páginas estratégicas', 'Corrigir links quebrados'],
        estimatedMinutes: 40,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Indexação',
        description: 'Submissão e checagem de cobertura no Google Search Console.',
        checklist: ['Verificar no Google Search Console', 'Solicitar indexação das páginas principais', 'Monitorar cobertura de páginas'],
        estimatedMinutes: 30,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      },
      {
        id: 'step-11',
        order: 11,
        title: 'Monitoramento',
        description: 'Configuração de rastreadores de posição e baseline.',
        checklist: ['Configurar painel de rank tracking', 'Registrar posições de partida (Baseline)', 'Programar relatório mensal'],
        estimatedMinutes: 30,
        responsibleRole: 'Especialista em SEO',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Implementação de Automação',
    category: 'automacao',
    department: 'Engenharia de Processos',
    description: 'Conexão de ferramentas, gatilhos e webhooks para eliminar trabalho manual.',
    content: 'Padrão de desenvolvimento e deploy de automações empresariais.',
    serviceName: 'Automação',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Levantamento do processo',
        description: 'Mapear passos manuais, ferramentas e volumetria.',
        checklist: ['Mapear tarefas manuais repetitivas', 'Identificar sistemas envolvidos', 'Levantar volume diário de dados'],
        estimatedMinutes: 40,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Definição do objetivo',
        description: 'Mapear tempo economizado e metas de precisão.',
        checklist: ['Definir redução de tempo esperada', 'Estipular taxa de confiabilidade', 'Mapear responsáveis pela intervenção humana'],
        estimatedMinutes: 25,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Mapeamento do fluxo',
        description: 'Desenhar diagrama do fluxo e tratamentos de erro.',
        checklist: ["Desenhar diagrama de fluxo (BPMN)", "Mapear condições 'Se / Então'", 'Definir tratamentos de exceção'],
        estimatedMinutes: 45,
        responsibleRole: 'Arquiteto de Soluções',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Definição dos gatilhos',
        description: 'Identificar gatilhos de disparo (webhooks / eventos).',
        checklist: ['Identificar evento inicial (Trigger)', 'Configurar webhook ou polling', 'Validar payload de entrada'],
        estimatedMinutes: 30,
        responsibleRole: 'Desenvolvedor / Automação',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Definição das ações',
        description: 'Sequência de chamadas de API e transformações de dados.',
        checklist: ['Listar passos sequenciais', 'Definir chamadas de API necessárias', 'Mapear formatação de dados'],
        estimatedMinutes: 35,
        responsibleRole: 'Desenvolvedor / Automação',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Configuração',
        description: 'Construção da lógica no n8n, Make ou Zapier.',
        checklist: ['Configurar cenário no n8n/Make/Zapier', 'Criar variáveis e chaves de ambiente', 'Implementar lógica de processamento'],
        estimatedMinutes: 90,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Integrações',
        description: 'Autenticação e testes de conectividade entre plataformas.',
        checklist: ['Autenticar APIs de terceiros (OAuth / Tokens)', 'Testar envio e recebimento de mensagens', 'Conectar com CRM / Banco de dados'],
        estimatedMinutes: 60,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Testes',
        description: 'Simulações em sandbox e validação de logs.',
        checklist: ['Executar testes em ambiente de homologação', 'Simular cenários de falha e timeout', 'Verificar logs de execução'],
        estimatedMinutes: 45,
        responsibleRole: 'QA / Especialista',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Correções',
        description: 'Tratamento de exceções e payloads inesperados.',
        checklist: ['Ajustar payloads com erro', 'Tratar campos nulos ou inesperados', 'Otimizar tempo de resposta'],
        estimatedMinutes: 30,
        responsibleRole: 'Especialista em Automação',
        required: false,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Publicação',
        description: 'Ativação do cenário em produção com alertas.',
        checklist: ['Ativar cenário em produção', 'Configurar alertas de erro via Slack/WhatsApp', 'Documentar credenciais'],
        estimatedMinutes: 20,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      },
      {
        id: 'step-11',
        order: 11,
        title: 'Monitoramento',
        description: 'Acompanhamento contínuo das execuções em tempo real.',
        checklist: ['Acompanhar primeiras 100 execuções', 'Validar integridade dos registros gerados', 'Checar limites de requisições da plataforma'],
        estimatedMinutes: 30,
        responsibleRole: 'Especialista em Automação',
        required: true,
        active: true
      }
    ]
  },
  {
    title: 'Onboarding de Hospedagem',
    category: 'hospedagem',
    department: 'Infraestrutura & Cloud',
    description: 'Configuração de domínio, SSL, DNS e servidores para estabilidade máxima.',
    content: 'Procedimento técnico de aprovisionamento e ativação de hospedagem.',
    serviceName: 'Hospedagem',
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Confirmar domínio',
        description: 'Verificação do registro e dados de propriedade.',
        checklist: ['Verificar disponibilidade do domínio', 'Confirmar propriedade e contato titular', 'Identificar empresa registradora (Registro.br, GoDaddy, etc.)'],
        estimatedMinutes: 15,
        responsibleRole: 'DevOps / Suporte',
        required: true,
        active: true
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Confirmar hospedagem',
        description: 'Aprovisionamento do plano de servidor adequado.',
        checklist: ['Definir plano adequado aos requisitos', 'Criar conta no servidor da agência', 'Configurar limites de disco e memória'],
        estimatedMinutes: 20,
        responsibleRole: 'DevOps / Suporte',
        required: true,
        active: true
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Solicitar acessos',
        description: 'Acessos ao painel de registro e provedor anterior.',
        checklist: ['Solicitar login do painel de registro', 'Solicitar acesso ao provedor anterior se houver migração'],
        estimatedMinutes: 15,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Validar DNS',
        description: 'Configuração dos apontamentos A, CNAME e verificação de propagação.',
        checklist: ['Configurar apontamento de registros A e CNAME', 'Configurar zona de DNS (Cloudflare ou servidor)', 'Aguardar e checar propagação mundial'],
        estimatedMinutes: 30,
        responsibleRole: 'DevOps / Suporte',
        required: true,
        active: true
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Configurar hospedagem',
        description: 'Criação de banco de dados e ambiente de execução.',
        checklist: ['Criar banco de dados MySQL/PostgreSQL', 'Instalar versão adequada do PHP/Node.js', 'Configurar FTP/SSH'],
        estimatedMinutes: 35,
        responsibleRole: 'DevOps / Suporte',
        required: true,
        active: true
      },
      {
        id: 'step-6',
        order: 6,
        title: 'Configurar SSL',
        description: 'Emissão e ativação do certificado de segurança HTTPS.',
        checklist: ["Emitir certificado Let's Encrypt ou comercial", 'Forçar redirecionamento HTTP para HTTPS', 'Garantir que não há conteúdo misto (mixed content)'],
        estimatedMinutes: 20,
        responsibleRole: 'DevOps / Suporte',
        required: true,
        active: true
      },
      {
        id: 'step-7',
        order: 7,
        title: 'Configurar e-mail, se aplicável',
        description: 'Configuração de caixas postais e registros de entrega segura.',
        checklist: ['Criar contas de e-mail corporativo', 'Configurar registros MX, SPF, DKIM e DMARC', 'Testar envio e recebimento'],
        estimatedMinutes: 30,
        responsibleRole: 'DevOps / Suporte',
        required: false,
        active: true
      },
      {
        id: 'step-8',
        order: 8,
        title: 'Validar site',
        description: 'Testes de carregamento, plugins e tempo de resposta.',
        checklist: ['Testar carregamento do site em HTTPS', 'Verificar funcionamento de banco de dados e plugins', 'Checar tempo de resposta do servidor'],
        estimatedMinutes: 25,
        responsibleRole: 'DevOps / QA',
        required: true,
        active: true
      },
      {
        id: 'step-9',
        order: 9,
        title: 'Registrar informações',
        description: 'Salvar credenciais seguras e ativar monitoramento de uptime.',
        checklist: ['Salvar credenciais de acesso no cofre de senhas', 'Registrar data de vencimento da anuidade', 'Adicionar servidor ao monitoramento de uptime'],
        estimatedMinutes: 15,
        responsibleRole: 'Operações',
        required: true,
        active: true
      },
      {
        id: 'step-10',
        order: 10,
        title: 'Finalizar configuração',
        description: 'Comunicação ao cliente e ativação de fatura de hospedagem.',
        checklist: ['Enviar e-mail de conclusão ao cliente', 'Confirmar início da fatura de hospedagem'],
        estimatedMinutes: 15,
        responsibleRole: 'Atendimento',
        required: true,
        active: true
      }
    ]
  }
];

export const seedDefaultProcesses = async (companyId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId || !companyId) return;

  try {
    const q = query(
      collection(db, processesCol), 
      where('userId', '==', userId), 
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const existingTitles = new Set(
      snapshot.docs.map(d => (d.data().title || '').trim().toLowerCase())
    );

    const now = new Date().toISOString();
    for (const proc of DEFAULT_APEXFLOW_PROCESSES) {
      if (!existingTitles.has(proc.title.trim().toLowerCase())) {
        await addDoc(collection(db, processesCol), {
          ...proc,
          companyId,
          userId,
          active: true,
          createdAt: now,
          updatedAt: now
        });
        existingTitles.add(proc.title.trim().toLowerCase());
      }
    }
  } catch (error) {
    console.error('Error seeding default processes:', error);
  }
};

