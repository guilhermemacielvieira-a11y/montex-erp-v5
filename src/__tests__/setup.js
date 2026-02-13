/**
 * MONTEX ERP V5 - Setup de Testes
 *
 * Configuração global para o ambiente de testes Vitest.
 * Inclui mocks de APIs externas e setup do DOM.
 */

import { vi } from 'vitest';

// Mock do Supabase client
vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isSupabaseConfigured: vi.fn(() => false),
  checkConnection: vi.fn().mockResolvedValue(false),
  clientesApi: {},
  obrasApi: {},
  orcamentosApi: {},
  listasApi: {},
  estoqueApi: {},
  pecasApi: {},
  funcionariosApi: {},
  equipesApi: {},
  comprasApi: {},
  notasFiscaisApi: {},
  movEstoqueApi: {},
  maquinasApi: {},
  medicoesApi: {},
  lancamentosApi: {},
  pedidosMaterialApi: {},
  expedicoesApi: {},
  configMedicaoApi: {},
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
