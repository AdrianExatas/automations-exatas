import { Page, Locator } from '@playwright/test';

/**
 * Dados do usuário extraídos
 */
export interface UserData {
  nome: string;
  cpf: string;
  telefone: string;
  emailContato: string;
  emailLogin: string;
  situacao: 'Ativo' | 'Inativo';
  departamentos: Departamento[];
  acessoPastas: AcessoPasta[];
  empresas: Empresa[];
  permissoes: string[];
}

/**
 * Departamento
 */
export interface Departamento {
  codigo: string;
  nome: string;
  nivel?: string;
  habilitado?: boolean;
}

/**
 * Acesso a pasta
 */
export interface AcessoPasta {
  codigo: string;
  nome: string;
  habilitado?: boolean;
}

/**
 * Empresa
 */
export interface Empresa {
  codigo?: string;
  empresa?: string;
  inscricao?: string;
  situacao?: string;
}

/**
 * Estratégia de seletor
 */
export interface SelectorStrategy {
  selector: string | ((page: Page) => Locator);
  description: string;
  priority?: number;
}

/**
 * Configuração de timeout
 */
export interface TimeoutConfig {
  SHORT: number;
  MEDIUM: number;
  LONG: number;
  MFA?: number;
}

/**
 * Configuração de retry
 */
export interface RetryConfig {
  MAX_RETRIES: number;
  INITIAL_DELAY: number;
  BACKOFF_MULTIPLIER: number;
}

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Erro de validação
 */
export interface ValidationError {
  type: string;
  field?: string;
  message: string;
}

/**
 * Métricas de extração
 */
export interface ExtractionMetrics {
  total: number;
  successful: number;
  failed: number;
  totalTime: number;
  averageTime: number;
  byField: Record<string, FieldMetrics>;
  byFunction: Record<string, FunctionMetrics>;
}

/**
 * Métricas de campo
 */
export interface FieldMetrics {
  total: number;
  successful: number;
  failed: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

/**
 * Métricas de função
 */
export interface FunctionMetrics {
  total: number;
  successful: number;
  failed: number;
  totalTime: number;
  averageTime: number;
  retries?: number;
}

/**
 * Configuração de automação
 */
export interface AutomationConfig {
  email: string;
  password: string;
  clientId: string;
  mfaMethod?: string;
  mfaCode?: string;
}

/**
 * Usuário da lista
 */
export interface UserListItem {
  index: number;
  name?: string;
  nome?: string;
  email?: string;
  id?: string;
  editButton?: Locator;
  row?: Locator;
}

/**
 * Configuração de seletor externo
 */
export interface SelectorDefinition {
  type: 'selector' | 'testid' | 'label';
  value: string;
  description: string;
  priority?: number;
}

/**
 * Configuração de seletores
 */
export interface SelectorConfig {
  fields: Record<string, SelectorDefinition[]>;
  labels?: Record<string, string[]>;
  navigation?: Record<string, any>;
  common?: Record<string, string>;
}

/**
 * Resultado de processamento paralelo
 */
export interface ParallelResult<T> {
  results: Array<{ user: any; result: T; index: number }>;
  errors: Array<{ user: any; error: Error; index: number }>;
  total: number;
  completed: number;
  failed: number;
  successRate: string;
}
