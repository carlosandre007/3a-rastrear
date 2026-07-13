export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  plates: string[];
  vehicles?: number[]; // Linked Traccar device IDs
  status: 'Ativo' | 'Inativo' | 'Bloqueado';
  joinDate: string;
  plan: string;
}

export interface AsaasPayment {
  id: string;
  customerId: string;
  clientName: string;
  value: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  dueDate: string;
  paymentDate?: string;
  pixCopyPaste: string;
  bankSlipBarcode: string;
  description: string;
}

export interface AsaasConfig {
  apiKey: string;
  webhookUrl: string;
  environment: 'sandbox' | 'production';
}

const BACKEND_URL = import.meta.env.VITE_LOG_BACKEND_URL || "http://localhost:3001";
const USE_REAL_ASAAS = false;
const ASAAS_URL = "https://sandbox.asaas.com/api/v3";

// Helper to check if production mode is active
export function isProductionModeActive(): boolean {
  return localStorage.getItem('3a-asaas-mode') === 'production';
}

export function setProductionMode(active: boolean) {
  localStorage.setItem('3a-asaas-mode', active ? 'production' : 'test');
}

// REST Integration helpers
async function fetchFromBackend(endpoint: string, options?: RequestInit) {
  try {
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`[Asaas API] Falha ao comunicar com backend em ${endpoint}, usando fallback local:`, e);
  }
  return null;
}

// ----------------------------------------------------
// EXPORTS API INTEGRATION (WITH BACKEND AND LOCALSTORAGE FALLBACK)
// ----------------------------------------------------

export async function createCustomer(customer: Omit<AsaasCustomer, 'id' | 'status' | 'joinDate'>): Promise<AsaasCustomer> {
  const newCustomer: AsaasCustomer = {
    ...customer,
    id: `cus_${Date.now()}`,
    status: 'Ativo',
    joinDate: new Date().toLocaleDateString('pt-BR')
  };

  // 1. Tenta persistir no backend
  const backendRes = await fetchFromBackend('/api/customers', {
    method: "POST",
    body: JSON.stringify(newCustomer)
  });

  // 2. Persistência em LocalStorage
  const localList = JSON.parse(localStorage.getItem('3a-asaas-customers') || '[]');
  localList.unshift(newCustomer);
  localStorage.setItem('3a-asaas-customers', JSON.stringify(localList));

  return backendRes || newCustomer;
}

export async function getCustomers(): Promise<AsaasCustomer[]> {
  // 1. Tenta buscar do backend
  const backendRes = await fetchFromBackend('/api/customers');
  if (backendRes) {
    localStorage.setItem('3a-asaas-customers', JSON.stringify(backendRes));
    return backendRes;
  }

  // 2. Fallback local
  return JSON.parse(localStorage.getItem('3a-asaas-customers') || '[]');
}

export async function removeCustomer(id: string): Promise<boolean> {
  // 1. Tenta remover no backend
  await fetchFromBackend(`/api/customers/${id}`, { method: "DELETE" });

  // 2. Remove no LocalStorage
  let localList = JSON.parse(localStorage.getItem('3a-asaas-customers') || '[]');
  localList = localList.filter((c: any) => c.id !== id);
  localStorage.setItem('3a-asaas-customers', JSON.stringify(localList));

  let localInvoices = JSON.parse(localStorage.getItem('3a-asaas-invoices') || '[]');
  localInvoices = localInvoices.filter((i: any) => i.customerId !== id);
  localStorage.setItem('3a-asaas-invoices', JSON.stringify(localInvoices));

  return true;
}

export async function updateCustomerStatus(id: string, status: 'Ativo' | 'Inativo' | 'Bloqueado') {
  // 1. Tenta atualizar no backend
  await fetchFromBackend(`/api/customers/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });

  // 2. Atualiza no LocalStorage
  const localList = JSON.parse(localStorage.getItem('3a-asaas-customers') || '[]');
  const updated = localList.map((c: any) => c.id === id ? { ...c, status } : c);
  localStorage.setItem('3a-asaas-customers', JSON.stringify(updated));
}

export async function createInvoice(
  customerId: string, 
  value: number, 
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD', 
  dueDate: string, 
  description: string
): Promise<AsaasPayment> {
  const customers = await getCustomers();
  const client = customers.find(c => c.id === customerId);
  const clientName = client ? client.name : "Cliente Desconhecido";

  const newInvoice: AsaasPayment = {
    id: `pay_${Date.now()}`,
    customerId,
    clientName,
    value,
    billingType,
    status: 'PENDING',
    dueDate,
    pixCopyPaste: "00020101021126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986540599.905802BR59153A_RASTREAR_SAOS6006RECIFE62070503abc6304",
    bankSlipBarcode: "34191.79001 01043.513184 91020.150008 7 98760000009990",
    description
  };

  // 1. Tenta no backend
  const backendRes = await fetchFromBackend('/api/invoices', {
    method: "POST",
    body: JSON.stringify(newInvoice)
  });

  // 2. LocalStorage
  const localInvoices = JSON.parse(localStorage.getItem('3a-asaas-invoices') || '[]');
  localInvoices.unshift(newInvoice);
  localStorage.setItem('3a-asaas-invoices', JSON.stringify(localInvoices));

  return backendRes || newInvoice;
}

export async function getInvoices(customerId?: string): Promise<AsaasPayment[]> {
  const backendRes = await fetchFromBackend(customerId ? `/api/invoices?customerId=${customerId}` : '/api/invoices');
  if (backendRes) {
    localStorage.setItem('3a-asaas-invoices', JSON.stringify(backendRes));
    return backendRes;
  }

  const invoices = JSON.parse(localStorage.getItem('3a-asaas-invoices') || '[]');
  if (customerId) {
    return invoices.filter((i: any) => i.customerId === customerId);
  }
  return invoices;
}

export async function payInvoice(id: string): Promise<AsaasPayment | null> {
  const backendRes = await fetchFromBackend(`/api/invoices/${id}/pay`, { method: "POST" });

  const invoices = JSON.parse(localStorage.getItem('3a-asaas-invoices') || '[]');
  let updatedInvoice: AsaasPayment | null = null;

  const nextInvoices = invoices.map((invoice: any) => {
    if (invoice.id === id) {
      updatedInvoice = {
        ...invoice,
        status: 'RECEIVED',
        paymentDate: new Date().toISOString().split('T')[0]
      };
      return updatedInvoice;
    }
    return invoice;
  });

  if (updatedInvoice) {
    localStorage.setItem('3a-asaas-invoices', JSON.stringify(nextInvoices));
    const customerId = (updatedInvoice as AsaasPayment).customerId;
    
    // Atualiza status do cliente localmente se não houver mais faturas vencidas
    const clientInvoices = nextInvoices.filter((i: any) => i.customerId === customerId);
    const hasAnyOverdueRemaining = clientInvoices.some((i: any) => i.status === 'OVERDUE');
    
    if (!hasAnyOverdueRemaining) {
      await updateCustomerStatus(customerId, 'Ativo');
    }
  }

  return backendRes || updatedInvoice;
}

// Reset Geral (Limpeza de Dados Fictícios de faturamento e testes)
export async function resetMockData(): Promise<boolean> {
  await fetchFromBackend('/api/customers/reset', { method: 'POST' });
  
  localStorage.setItem('3a-asaas-customers', JSON.stringify([]));
  localStorage.setItem('3a-asaas-invoices', JSON.stringify([]));
  localStorage.setItem('3a-geofences', JSON.stringify([]));
  localStorage.setItem('3a-alerts', JSON.stringify([]));
  localStorage.setItem('3a-command-logs', JSON.stringify([]));
  
  return true;
}

// --- CONFIGURAÇÃO E INTEGRAÇÃO DO ASAAS ---

export async function getAsaasConfig(): Promise<AsaasConfig> {
  const backendRes = await fetchFromBackend('/api/asaas/config');
  if (backendRes) {
    localStorage.setItem('3a-asaas-config', JSON.stringify(backendRes));
    return backendRes;
  }

  return JSON.parse(localStorage.getItem('3a-asaas-config') || JSON.stringify({
    apiKey: "",
    webhookUrl: "https://3arastrearof.com.br/api/asaas/webhook",
    environment: "sandbox"
  }));
}

export async function saveAsaasConfig(config: AsaasConfig): Promise<boolean> {
  const backendRes = await fetchFromBackend('/api/asaas/config', {
    method: 'POST',
    body: JSON.stringify(config)
  });

  localStorage.setItem('3a-asaas-config', JSON.stringify(config));
  return backendRes ? backendRes.success : true;
}

// Executa varredura de cobranças atrasadas e bloqueia inadimplentes
export async function checkOverduePayments(): Promise<{ suspendedClientIds: string[]; unsuspendedClientIds: string[] }> {
  const invoices = await getInvoices();
  const customers = await getCustomers();
  const todayStr = new Date().toISOString().split('T')[0];

  const suspendedClientIds: string[] = [];
  const unsuspendedClientIds: string[] = [];
  let updatedInvoices = false;

  const nextInvoices = invoices.map(invoice => {
    if (invoice.status === 'PENDING' && invoice.dueDate < todayStr) {
      updatedInvoices = true;
      return { ...invoice, status: 'OVERDUE' as const };
    }
    return invoice;
  });

  if (updatedInvoices) {
    localStorage.setItem('3a-asaas-invoices', JSON.stringify(nextInvoices));
    await fetchFromBackend('/api/invoices', {
      method: "POST",
      body: JSON.stringify(nextInvoices)
    });
  }

  for (const customer of customers) {
    const clientInvoices = nextInvoices.filter(i => i.customerId === customer.id);
    const hasOverdue = clientInvoices.some(i => i.status === 'OVERDUE');
    
    if (hasOverdue && customer.status !== 'Bloqueado') {
      suspendedClientIds.push(customer.id);
      await updateCustomerStatus(customer.id, 'Bloqueado');
    } else if (!hasOverdue && customer.status === 'Bloqueado') {
      unsuspendedClientIds.push(customer.id);
      await updateCustomerStatus(customer.id, 'Ativo');
    }
  }

  return { suspendedClientIds, unsuspendedClientIds };
}
