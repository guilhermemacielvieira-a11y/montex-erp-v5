// ============================================================
// MAIS — app da diretoria (/m/mais)
// ============================================================
// Usuário, atalhos de gestão, operação de campo, telas do computador e
// sistema. Itens filtrados por permissão (array = qualquer uma).
// ============================================================
import React, { useMemo } from 'react';
import { abrirNoComputador } from '../kit/fmt';
import { modulosLiberados } from '@/lib/acessoPaginas';
import {
  CheckCircle2, Bell, Briefcase, ClipboardList, Camera, Ruler, Package,
  Box, Columns3, FileText, Shield, Settings, Monitor, LogOut, ChevronRight, ScanLine, Hammer, Truck, BarChart3, LineChart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import versao from '@/version.json';
import { Tela, Secao, Grupo, Linha, Monograma } from '../kit';

const GRUPOS = [
  {
    titulo: 'Gestão',
    itens: [
      { to: '/m/painel/producao', icone: BarChart3, titulo: 'Painel de produção', sub: 'Setores, fluxo, obras e equipe', tom: 'teal', perm: 'producao.view' },
      { to: '/m/painel/financeiro', icone: LineChart, titulo: 'Painel financeiro', sub: 'Caixa, resultado e contas da empresa', tom: 'teal', perm: 'financeiro.view' },
      { to: '/m/aprovacoes', icone: CheckCircle2, titulo: 'Aprovações', sub: 'Medições, orçamentos e compras', tom: 'ok', perm: ['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar'] },
      { to: '/m/alertas', icone: Bell, titulo: 'Alertas', sub: 'Radar de riscos e avisos', tom: 'warn' },
      { to: '/m/comercial', icone: Briefcase, titulo: 'Comercial', sub: 'Funil de orçamentos e clientes', tom: 'teal', perm: ['orcamentos.view', 'comercial.view', 'clientes.view'] },
    ],
  },
  {
    titulo: 'Operação no campo',
    itens: [
      { to: '/m/campo/producao', icone: ScanLine, titulo: 'Lançar produção', sub: 'Avançar etapa por leitura de código', perm: 'producao.lancar_avanco' },
      { to: '/m/campo/montagem', icone: Hammer, titulo: 'Marcar montagem', sub: 'Peças montadas na obra, com foto', perm: 'montagem.edit' },
      { to: '/m/campo/expedicao', icone: Truck, titulo: 'Conferir e despachar carga', sub: 'Romaneios do dia', perm: 'expedicao.edit' },
      { to: '/m/diario-obra', icone: ClipboardList, titulo: 'Diário de obra', perm: ['obras.edit', 'obras.view'] },
      { to: '/m/evidencias', icone: Camera, titulo: 'Evidências', sub: 'Fotos de obra e carga', perm: 'producao.view' },
      { to: '/m/medicao', icone: Ruler, titulo: 'Medição', perm: 'medicao.view' },
      { to: '/m/estoque', icone: Package, titulo: 'Estoque detalhado', perm: 'estoque.view' },
    ],
  },
  {
    titulo: 'No computador',
    itens: [
      { to: '/m/3d', icone: Box, titulo: 'Visualizador 3D', sub: 'Abre a versão completa', perm: 'viewer3d.view' },
      { to: '/m/kanban', icone: Columns3, titulo: 'Kanban de produção', sub: 'Abre a versão completa', perm: 'kanban.view' },
      { to: '/m/relatorios', icone: FileText, titulo: 'Relatórios', sub: 'Abre a versão completa', perm: 'relatorios.view' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { to: '/m/usuarios', icone: Shield, titulo: 'Usuários', sub: 'Acessos e permissões', perm: 'usuarios.manage' },
      { to: '/m/config', icone: Settings, titulo: 'Configurações', sub: 'Notificações e sincronização' },
      { href: '/', icone: Monitor, titulo: 'Abrir versão desktop' },
      { acao: 'sair', icone: LogOut, titulo: 'Sair', tom: 'bad' },
    ],
  },
];

const iniciais = (nome) => String(nome || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'M';

export default function Mais() {
  const { user, hasPermission, logout, ROLE_LABELS } = useAuth() || {};
  const nome = user?.nome || user?.name || user?.full_name || user?.email || 'Usuário';
  const papel = (ROLE_LABELS && user?.role && ROLE_LABELS[user.role]) || user?.role || '';
  const cargo = [user?.cargo, papel].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');

  // App nativo (Capacitor) nunca mostra o desktop (App.jsx) — esconde o atalho.
  const nativo = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

  const grupos = useMemo(() => GRUPOS
    .map((g) => ({
      ...g,
      itens: g.itens.filter((it) => {
        if (it.href && nativo) return false;
        if (!it.perm || !hasPermission) return true;
        return (Array.isArray(it.perm) ? it.perm : [it.perm]).some((p) => hasPermission(p));
      }),
    }))
    .filter((g) => g.itens.length > 0), [hasPermission, nativo]);

  const abrirDesktop = () => abrirNoComputador('/');
  // O desktop abre só com os módulos liberados (src/lib/acessoPaginas.js).
  const admin = !!hasPermission?.('*');
  const modulos = useMemo(() => modulosLiberados(hasPermission), [hasPermission]);
  const subDesktop = admin
    ? 'ERP completo neste aparelho'
    : (modulos.length ? `Só seus módulos: ${modulos.join(', ')}` : 'Nenhum módulo do computador liberado');

  return (
    <Tela
      titulo="Mais"
      acoes={<Monograma tamanho={36} className="mr-1" />}
    >
      <Grupo className="mt-4">
        <Link to="/m/perfil" className="flex items-center gap-3.5 px-4 py-3.5 active:bg-mx-s2" aria-label={`Perfil de ${nome}`}>
          <span className="mx-num flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mx-teal text-[17px] text-white" aria-hidden>
            {iniciais(nome)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold text-mx-text">{nome}</span>
            {cargo && <span className="block truncate text-[13px] text-mx-text2">{cargo}</span>}
            {user?.email && user.email !== nome && <span className="block truncate text-[13px] text-mx-text3">{user.email}</span>}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-mx-text3" aria-hidden />
        </Link>
      </Grupo>

      {grupos.map((g) => (
        <Secao key={g.titulo} titulo={g.titulo}>
          <Grupo>
            {g.itens.map((it) => {
              if (it.acao === 'sair') {
                return <Linha key="sair" icone={it.icone} iconeTom="bad" titulo={it.titulo} onClick={() => logout?.()} chevron={false} />;
              }
              if (it.href) {
                return <Linha key={it.href} icone={it.icone} iconeTom="neutro" titulo={it.titulo} sub={subDesktop} onClick={abrirDesktop} />;
              }
              return <Linha key={it.to} to={it.to} icone={it.icone} iconeTom={it.tom || 'neutro'} titulo={it.titulo} sub={it.sub} />;
            })}
          </Grupo>
        </Secao>
      ))}

      <p className="mt-8 text-center text-[12px] text-mx-text3">
        Grupo Montex · soluções em aço
        {versao?.versao ? <><br />Versão {versao.versao}{versao.data ? ` · ${versao.data.split('-').reverse().join('/')}` : ''}</> : null}
      </p>
    </Tela>
  );
}
