export interface Account {
  id: number;
  ownerName: string;
  iban: string;
  balance: number;
  currency: string;
  type: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt?: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  amount: number;
  description: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  reference?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
}

export interface PageInfo {
  currentPage: number;
  totalPages: number;
  totalElements: number;
}

export interface AccountsPage {
  content: Account[];
  page: PageInfo;
}
