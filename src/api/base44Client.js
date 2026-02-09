// Mock do Base44 SDK para modo offline/local
// Este arquivo substitui as chamadas de rede por dados locais

const mockUser = {
  id: 'local-user-001',
  email: 'guilherme.maciel.vieira@gmail.com',
  name: 'Guilherme Maciel',
  role: 'admin'
};

// Mock das entidades
const createMockEntity = (name) => ({
  list: async () => [],
  filter: async () => [],
  get: async (id) => null,
  create: async (data) => ({ id: `${name}-${Date.now()}`, ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => true,
  subscribe: (callback) => {
    // Retorna função de unsubscribe
    return () => {};
  }
});

// Mock do cliente Base44
export const base44 = {
  auth: {
    me: async () => mockUser,
    logout: (redirectUrl) => {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin: (redirectUrl) => {
      window.location.reload();
    }
  },
  entities: {
    Tarefa: createMockEntity('Tarefa'),
    ItemProducao: createMockEntity('ItemProducao'),
    LancamentoProducao: createMockEntity('LancamentoProducao'),
    Projeto: createMockEntity('Projeto'),
    Orcamento: createMockEntity('Orcamento'),
    Cliente: createMockEntity('Cliente'),
    Funcionario: createMockEntity('Funcionario'),
    Despesa: createMockEntity('Despesa'),
    Receita: createMockEntity('Receita'),
    Relatorio: createMockEntity('Relatorio'),
    MovimentacaoFinanceira: createMockEntity('MovimentacaoFinanceira'),
    Automacao: createMockEntity('Automacao'),
    FluxoAprovacao: createMockEntity('FluxoAprovacao'),
    SolicitacaoAprovacao: createMockEntity('SolicitacaoAprovacao'),
    User: createMockEntity('User'),
    MensagemProjeto: createMockEntity('MensagemProjeto'),
    AlocacaoRecurso: createMockEntity('AlocacaoRecurso'),
    AgendamentoRelatorio: createMockEntity('AgendamentoRelatorio'),
    AgendamentoRelatorioRecorrente: createMockEntity('AgendamentoRelatorioRecorrente'),
    MapeamentoPredefinido: createMockEntity('MapeamentoPredefinido'),
    Material: createMockEntity('Material'),
    ConsumoDeMaterial: createMockEntity('ConsumoDeMaterial'),
    Custo: createMockEntity('Custo'),
    CustoProducao: createMockEntity('CustoProducao'),
    FiltroPersonalizado: createMockEntity('FiltroPersonalizado'),
    HistoricoRelatorio: createMockEntity('HistoricoRelatorio'),
    LogAutomacao: createMockEntity('LogAutomacao'),
    ModeloRelatorio: createMockEntity('ModeloRelatorio'),
    Notificacao: createMockEntity('Notificacao'),
    OrcamentoDetalhado: createMockEntity('OrcamentoDetalhado'),
    AlocacaoDespesa: createMockEntity('AlocacaoDespesa'),
  },
  storage: {
    upload: async (file) => ({
      url: URL.createObjectURL(file),
      name: file.name
    }),
    delete: async (url) => true
  }
};

export default base44;
