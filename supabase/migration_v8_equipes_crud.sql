-- ============================================================
-- MIGRATION V8 - CRUD Completo de Funcionários e Equipes
-- ============================================================
-- Garante que as tabelas existem com campos completos
-- e seed data dos 22 funcionários + 4 equipes reais
-- ============================================================

-- 1. TABELA DE FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS funcionarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cargo TEXT,
    setor TEXT,
    equipe_id TEXT,
    equipe_nome TEXT,
    salario NUMERIC(10,2) DEFAULT 0,
    admissao DATE,
    ativo BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'ativo',
    telefone TEXT,
    email TEXT,
    foto_url TEXT,
    pecas_mes INTEGER DEFAULT 0,
    eficiencia NUMERIC(5,2) DEFAULT 0,
    qualidade NUMERIC(5,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE EQUIPES
CREATE TABLE IF NOT EXISTS equipes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT,
    lider_id TEXT,
    lider_nome TEXT,
    turno TEXT DEFAULT 'Diurno',
    setor TEXT,
    obra_atual_id TEXT,
    obra_atual_nome TEXT,
    meta_mes INTEGER DEFAULT 0,
    producao_mes INTEGER DEFAULT 0,
    eficiencia NUMERIC(5,2) DEFAULT 0,
    ativa BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_funcionarios_setor ON funcionarios(setor);
CREATE INDEX IF NOT EXISTS idx_funcionarios_equipe ON funcionarios(equipe_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo ON funcionarios(ativo);
CREATE INDEX IF NOT EXISTS idx_equipes_tipo ON equipes(tipo);
CREATE INDEX IF NOT EXISTS idx_equipes_ativa ON equipes(ativa);

-- 4. RLS
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'funcionarios_all' AND tablename = 'funcionarios') THEN
    CREATE POLICY "funcionarios_all" ON funcionarios FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'equipes_all' AND tablename = 'equipes') THEN
    CREATE POLICY "equipes_all" ON equipes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. SEED DATA - EQUIPES (upsert para não duplicar)
INSERT INTO equipes (id, nome, tipo, lider_id, lider_nome, turno, setor, meta_mes, producao_mes, eficiencia, ativa) VALUES
  ('EQP001', 'Equipe Fábrica', 'producao', 'FUNC003', 'David Barbosa de Souza', 'Diurno', 'Fabricação', 600, 563, 92, true),
  ('EQP002', 'Equipe Pintura', 'pintura', 'FUNC008', 'Flavio de Jesus Santos', 'Diurno', 'Pintura', 140, 120, 85, true),
  ('EQP003', 'Equipe Montagem Campo', 'montagem', 'FUNC022', 'Whashington de Oliveira', 'Diurno', 'Montagem', 850, 745, 89, true),
  ('EQP004', 'Equipe Montagem Interior', 'montagem', 'FUNC011', 'Jeferson Bruno de O. Costa', 'Diurno', 'Montagem', 150, 110, 77, true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, lider_id = EXCLUDED.lider_id,
  lider_nome = EXCLUDED.lider_nome, turno = EXCLUDED.turno, setor = EXCLUDED.setor,
  meta_mes = EXCLUDED.meta_mes, producao_mes = EXCLUDED.producao_mes, eficiencia = EXCLUDED.eficiencia;

-- 6. SEED DATA - FUNCIONÁRIOS (upsert para não duplicar)
INSERT INTO funcionarios (id, nome, cargo, setor, equipe_id, equipe_nome, salario, status, ativo, pecas_mes, eficiencia, qualidade) VALUES
  ('FUNC001', 'Cristiane Vieira', 'Auxiliar de Serviços Gerais', 'Geral', NULL, '-', 3322, 'ativo', true, 0, 0, 0),
  ('FUNC002', 'Diego Alves da Silva', 'Montador I', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 4500, 'ativo', true, 85, 88, 96),
  ('FUNC003', 'David Barbosa de Souza', 'Coordenador de Produção', 'Produção', 'EQP001', 'Equipe Fábrica', 7000, 'ativo', true, 0, 0, 0),
  ('FUNC004', 'Eder Bruno Silva Ferreira', 'Montador I', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 4500, 'ativo', true, 92, 91, 97),
  ('FUNC005', 'Derlei Gobbi', 'Montador I', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 4500, 'ativo', true, 78, 82, 94),
  ('FUNC006', 'Erick Welison Hosni de Paula', 'Meio Oficial de Montador', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 3800, 'ativo', true, 55, 76, 92),
  ('FUNC007', 'Flavio da Cruz', 'Instalador Esquadrias Alumínio', 'Fabricação', 'EQP001', 'Equipe Fábrica', 5200, 'ativo', true, 68, 89, 98),
  ('FUNC008', 'Flavio de Jesus Santos', 'Líder de Produção', 'Produção', 'EQP001', 'Equipe Fábrica', 6500, 'ativo', true, 45, 94, 99),
  ('FUNC009', 'Gilmar Sousa da Silva', 'Soldador II', 'Solda', 'EQP001', 'Equipe Fábrica', 5500, 'ativo', true, 110, 96, 98),
  ('FUNC010', 'Gabriel Ferreira Santos', 'Montador I', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 4500, 'ativo', true, 82, 85, 95),
  ('FUNC011', 'Jeferson Bruno de O. Costa', 'Montador III', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 5800, 'ativo', true, 120, 97, 99),
  ('FUNC012', 'João Ermelindo Soares', 'Serralheiro de Alumínio', 'Fabricação', 'EQP001', 'Equipe Fábrica', 5000, 'ativo', true, 95, 93, 97),
  ('FUNC013', 'João Batista Alves Rodrigues', 'Ajudante de Montagem', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 3200, 'ativo', true, 40, 72, 90),
  ('FUNC014', 'José Eduardo Lucas', 'Meio Oficial de Montador', 'Montagem', 'EQP004', 'Equipe Montagem Interior', 3800, 'ativo', true, 58, 78, 93),
  ('FUNC015', 'Juscelio Rodrigues de Souza', 'Soldador I', 'Solda', 'EQP001', 'Equipe Fábrica', 4800, 'ativo', true, 88, 90, 96),
  ('FUNC016', 'Juscelio Rodrigues', 'Montador III', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 5800, 'ativo', true, 115, 95, 98),
  ('FUNC017', 'Luiz Barbosa Ferrera', 'Soldador I', 'Solda', 'EQP001', 'Equipe Fábrica', 4800, 'ativo', true, 85, 88, 95),
  ('FUNC018', 'Ricardo Alves Pereira', 'Caldeireiro Montador', 'Fabricação', 'EQP001', 'Equipe Fábrica', 5500, 'ativo', true, 72, 91, 97),
  ('FUNC019', 'Tarcísio Vieira de Almeida', 'Almoxarife', 'Geral', NULL, '-', 3500, 'ativo', true, 0, 0, 0),
  ('FUNC020', 'Waldercy Miranda', 'Montador II', 'Montagem', 'EQP003', 'Equipe Montagem Campo', 5200, 'ativo', true, 98, 92, 96),
  ('FUNC021', 'Wendel Gabriel Alves dos Reis', 'Meio Oficial de Montador', 'Montagem', 'EQP004', 'Equipe Montagem Interior', 3800, 'ativo', true, 52, 75, 91),
  ('FUNC022', 'Whashington de Oliveira', 'Encarregado de Campo II', 'Produção', 'EQP003', 'Equipe Montagem Campo', 6800, 'ativo', true, 35, 93, 99)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, cargo = EXCLUDED.cargo, setor = EXCLUDED.setor,
  equipe_id = EXCLUDED.equipe_id, equipe_nome = EXCLUDED.equipe_nome,
  salario = EXCLUDED.salario, pecas_mes = EXCLUDED.pecas_mes,
  eficiencia = EXCLUDED.eficiencia, qualidade = EXCLUDED.qualidade;
