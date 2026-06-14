// ============================================================
// USUÁRIOS MOBILE — gestão completa de usuários, funções e atribuições
// ============================================================
// Painel admin no celular: lista, cria, edita função (role), ajusta a matriz
// de permissões personalizadas, redefine senha e ativa/desativa usuários.
// Tudo via Edge Function `admin-users` (service_role no servidor) — o cliente
// só carrega a anon key. Gate de rota: perm 'usuarios.manage' (MobileApp).
// ============================================================
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Shield, Mail, KeyRound,
  Power, Check, Eye, EyeOff, Wand2, Users, CircleSlash,
  Share2, Copy, Send, CheckCircle2, Link2,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import SearchBar from '../ui/SearchBar';
import EmptyState from '../ui/EmptyState';
import { tap, success as hapticSuccess } from '../ui/haptics';
import { useAuth } from '@/lib/AuthContext';
import {
  getAllUserProfiles, createNewUser, updateUserProfile,
  resetUserPassword, toggleUserActive,
} from '@/api/supabaseClient';
import {
  ALL_PERMISSIONS, ROLE_ORDER, ROLE_META, ROLE_BADGE,
  ROLE_PERMISSIONS_MAP, roleLabel,
} from '@/lib/permissions';
import { toast } from 'react-hot-toast';

// Gera senha inicial razoável (sem caracteres ambíguos) p/ entregar ao usuário.
function gerarSenha() {
  const abc = 'abcdefghijkmnpqrstuvwxyz';
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const num = '23456789';
  const sym = '!@#$%&*';
  const pool = abc + ABC + num + sym;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let out = pick(ABC) + pick(abc) + pick(num) + pick(sym);
  for (let i = 0; i < 8; i++) out += pick(pool);
  return out.split('').sort(() => Math.random() - 0.5).join('');
}

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

// "É a conta do próprio usuário logado?" — trava de auto-bloqueio (não pode
// desativar a si mesmo). ATENÇÃO ao shape: o user do AuthContext usa `authId`
// (camelCase) e `id`; o perfil cru de getAllUserProfiles usa `auth_id` (snake).
function mesmaConta(atual, u) {
  if (!atual || !u) return false;
  return (atual.id && atual.id === u.id)
    || (atual.authId && atual.authId === u.auth_id)
    || (atual.email && u.email && atual.email.toLowerCase() === u.email.toLowerCase());
}

// ============================================================
// LINK DE ACESSO — onboarding do usuário
// ============================================================
// O login (/login) aceita `?email=` e pré-preenche o campo (LoginPage). Não há
// magic-link/token no app, então usamos o MESMO formato que o desktop já usa:
// {origin}/login?email=... + mensagem com email e senha. A senha em texto só
// existe no momento da criação (ou de um reset) — nunca lemos hash do banco.
function urlAcesso(email) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://montex-erp-v5.vercel.app';
  return `${origin}/login?email=${encodeURIComponent(String(email || '').trim())}`;
}

function mensagemAcesso({ nome, email, senha, role }) {
  const url = urlAcesso(email);
  const linhas = [
    `Olá ${nome || ''}! Seu acesso ao MONTEX ERP foi criado.`,
    '',
    `🔗 Acessar: ${url}`,
    `📧 Email: ${email}`,
  ];
  if (senha) linhas.push(`🔑 Senha: ${senha}`);
  if (role) linhas.push(`👤 Função: ${roleLabel(role)}`);
  linhas.push('', 'Abra o link, entre com o email e a senha acima e comece a usar. Você pode trocar a senha depois, em Perfil → Configurações.');
  return linhas.join('\n');
}

// Compartilha via Web Share API (nativo: WhatsApp, email, etc.); se indisponível
// ou cancelado, copia para a área de transferência. Retorna o canal usado.
async function compartilharAcesso({ nome, texto }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: `Acesso MONTEX ERP — ${nome || ''}`.trim(), text: texto });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel'; // usuário fechou a folha de share
      // outras falhas → tenta copiar
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return 'copied';
  } catch {
    return 'fail';
  }
}

// Permissões agrupadas por módulo (memo estático — vem do catálogo canônico).
const GRUPOS_PERM = ALL_PERMISSIONS.reduce((acc, p) => {
  (acc[p.grupo] = acc[p.grupo] || []).push(p);
  return acc;
}, {});

// Preset de módulos de uma FUNÇÃO (sem o curinga '*'). Serve só para PRÉ-MARCAR
// a matriz — o que vale para o acesso é a seleção final salva em `permissoes`.
// Modelo: o usuário vê/edita SOMENTE os módulos marcados; a função não inclui
// nada além do que está visível/marcado (hasPermission usa só `permissoes`
// quando ela é não-vazia).
const presetFuncao = (role) => (ROLE_PERMISSIONS_MAP[role] || []).filter(p => p !== '*');

// Matriz de módulos (checkboxes por grupo) reutilizada em criar e editar.
function MatrizPermissoes({ perms, onToggle, disabled }) {
  return (
    <div className="space-y-3 mt-2">
      {Object.entries(GRUPOS_PERM).map(([grupo, itens]) => {
        const marcados = itens.filter(p => perms.includes(p.key)).length;
        return (
          <div key={grupo} className="bg-slate-800/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{grupo}</div>
              <span className={`text-[10px] font-bold ${marcados ? 'text-amber-400' : 'text-slate-600'}`}>{marcados}/{itens.length}</span>
            </div>
            <div className="space-y-1.5">
              {itens.map(p => (
                <label key={p.key} className="flex items-center gap-2.5 py-1 active:opacity-70">
                  <CheckBox checked={perms.includes(p.key)} disabled={disabled} onChange={() => onToggle(p.key)} />
                  <span className="text-[13px] text-slate-200 flex-1">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Botão de compartilhar/copiar acesso reutilizado nos dois sheets.
async function enviarAcessoUI({ nome, email, senha, role }) {
  const texto = mensagemAcesso({ nome, email, senha, role });
  const canal = await compartilharAcesso({ nome, texto });
  if (canal === 'shared') hapticSuccess();
  if (canal === 'copied') toast.success('Dados de acesso copiados — cole onde quiser enviar');
  else if (canal === 'fail') toast.error('Não foi possível compartilhar nem copiar');
  return canal;
}

export default function UsuariosMobile() {
  const { user: atual, hasPermission } = useAuth() || {};
  const podeGerenciar = hasPermission ? hasPermission('usuarios.manage') : false;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState('todos');

  // sheet: { mode: 'novo' | 'editar', user }
  const [sheet, setSheet] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const lista = await getAllUserProfiles();
      setUsers(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const stats = useMemo(() => ({
    total: users.length,
    ativos: users.filter(u => u.ativo !== false).length,
    inativos: users.filter(u => u.ativo === false).length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let arr = users;
    if (filtroRole !== 'todos') arr = arr.filter(u => u.role === filtroRole);
    if (q) arr = arr.filter(u =>
      (u.nome || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q));
    // Ordena: ativos primeiro, depois por hierarquia de função, depois nome
    const ord = (r) => { const i = ROLE_ORDER.indexOf(r); return i < 0 ? 99 : i; };
    return [...arr].sort((a, b) =>
      (Number(b.ativo !== false) - Number(a.ativo !== false)) ||
      (ord(a.role) - ord(b.role)) ||
      String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [users, busca, filtroRole]);

  // Atualiza um usuário na lista local (após salvar) sem refetch completo.
  const patchLocal = useCallback((id, patch) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  return (
    <MobileLayout title="Usuários">
      {/* Stats */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Total" value={stats.total} color="text-slate-100" />
          <Stat label="Ativos" value={stats.ativos} color="text-emerald-400" />
          <Stat label="Inativos" value={stats.inativos} color="text-slate-400" />
          <Stat label="Admins" value={stats.admins} color="text-orange-400" />
        </div>
      </div>

      {/* Busca + filtro por função */}
      <div className="px-4 pt-3 space-y-2">
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar nome, email ou cargo…" />
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Chip ativo={filtroRole === 'todos'} onClick={() => setFiltroRole('todos')}>Todos</Chip>
          {ROLE_ORDER.map(r => (
            <Chip key={r} ativo={filtroRole === r} onClick={() => setFiltroRole(r)}>
              {ROLE_META[r].label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pt-3 space-y-2 pb-4">
        {loading && <div className="text-center py-10 text-slate-400 text-sm">Carregando usuários…</div>}

        {!loading && erro && (
          <EmptyState
            icon={CircleSlash}
            title="Não foi possível carregar"
            subtitle={erro}
            actionLabel="Tentar de novo"
            onAction={carregar}
          />
        )}

        {!loading && !erro && lista.length === 0 && (
          <EmptyState
            icon={Users}
            title={busca || filtroRole !== 'todos' ? 'Nenhum usuário encontrado' : 'Nenhum usuário ainda'}
            subtitle={busca || filtroRole !== 'todos' ? 'Ajuste a busca ou o filtro' : 'Toque em “Novo usuário” para começar'}
            actionLabel={busca || filtroRole !== 'todos' ? 'Limpar filtros' : undefined}
            onAction={busca || filtroRole !== 'todos' ? (() => { setBusca(''); setFiltroRole('todos'); }) : undefined}
          />
        )}

        {!loading && !erro && lista.map(u => (
          <UserCard
            key={u.id}
            u={u}
            ehVoce={mesmaConta(atual, u)}
            onTap={() => { tap('light'); setSheet({ mode: 'editar', user: u }); }}
          />
        ))}
      </div>

      {/* FAB Novo usuário */}
      {podeGerenciar && !loading && (
        <button
          onClick={() => { tap('light'); setSheet({ mode: 'novo' }); }}
          className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          <UserPlus className="w-5 h-5" /> Novo usuário
        </button>
      )}

      {/* Sheets */}
      <NovoUsuarioSheet
        open={sheet?.mode === 'novo'}
        onClose={() => setSheet(null)}
        // NÃO fecha o sheet aqui: após criar, ele exibe o CARTÃO DE ACESSO
        // (fase 2). Só atualiza a lista do fundo; o fechamento é via "Concluir".
        onCriado={(novo) => { setUsers(prev => [novo, ...prev]); carregar(); }}
      />
      <EditarUsuarioSheet
        open={sheet?.mode === 'editar'}
        user={sheet?.user}
        ehVoce={mesmaConta(atual, sheet?.user)}
        podeGerenciar={podeGerenciar}
        onClose={() => setSheet(null)}
        onPatch={patchLocal}
      />
    </MobileLayout>
  );
}

// ============================================================
// CARD DE USUÁRIO
// ============================================================
function UserCard({ u, ehVoce, onTap }) {
  const inicial = (u.nome || u.email || 'U').trim().charAt(0).toUpperCase();
  const inativo = u.ativo === false;
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition ${inativo ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-800 active:border-amber-500/40'}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 ${inativo ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950'}`}>
        {inicial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate flex items-center gap-1.5">
          {u.nome || '—'}
          {ehVoce && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">VOCÊ</span>}
        </div>
        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
          <Mail className="w-3 h-3 flex-shrink-0" /> {u.email || '—'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] || ROLE_BADGE.viewer}`}>
          {roleLabel(u.role)}
        </span>
        {inativo
          ? <span className="text-[9px] font-bold text-slate-500">INATIVO</span>
          : Array.isArray(u.permissoes) && u.permissoes.length > 0
            ? <span className="text-[9px] font-bold text-cyan-400">PERSONALIZADO</span>
            : null}
      </div>
    </motion.button>
  );
}

// ============================================================
// SHEET: NOVO USUÁRIO
// ============================================================
function NovoUsuarioSheet({ open, onClose, onCriado }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [role, setRole] = useState('operador');
  // Módulos liberados (array de keys). A função só PRÉ-MARCA; o acesso é o que
  // estiver marcado aqui — o usuário vê/edita SOMENTE estes módulos.
  const [perms, setPerms] = useState(() => presetFuncao('operador'));
  const [salvando, setSalvando] = useState(false);
  // Após criar: guarda os dados para o cartão de acesso (fase 2 do sheet).
  const [criado, setCriado] = useState(null); // { nome, email, senha, role }

  // Reseta ao abrir
  useEffect(() => {
    if (open) { setNome(''); setEmail(''); setCargo(''); setSenha(gerarSenha()); setVerSenha(false); setRole('operador'); setPerms(presetFuncao('operador')); setCriado(null); }
  }, [open]);

  // Trocar a função RE-APLICA o preset dela na matriz (a função é um atalho de
  // seleção). O admin pode ajustar manualmente depois.
  const escolherRole = (r) => { setRole(r); setPerms(r === 'admin' ? [] : presetFuncao(r)); };
  const togglePerm = (key) => setPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const ehAdmin = role === 'admin';
  // Admin = acesso total (permissoes vazio → herda '*' do role). Demais funções
  // gravam a SELEÇÃO explícita de módulos (sem '*').
  const permissoesSalvar = ehAdmin ? [] : perms.filter(p => p !== '*');
  const valido = nome.trim() && emailValido(email) && senha.length >= 6 && role && (ehAdmin || permissoesSalvar.length > 0);

  const criar = async () => {
    if (!valido || salvando) return;
    setSalvando(true);
    try {
      const novo = await createNewUser({ email: email.trim(), password: senha, nome: nome.trim(), role, cargo: cargo.trim() || null, permissoes: permissoesSalvar });
      hapticSuccess();
      toast.success(`${nome.trim()} criado — ${ehAdmin ? 'acesso total' : `${permissoesSalvar.length} permissõe(s)`}`);
      onCriado?.(novo || { id: `tmp-${Date.now()}`, nome: nome.trim(), email: email.trim(), role, permissoes: permissoesSalvar, ativo: true });
      // Vai para a fase do cartão de acesso (NÃO fecha) — é o único momento com
      // a senha em texto para entregar ao usuário.
      setCriado({ nome: nome.trim(), email: email.trim(), senha, role });
    } catch (e) {
      toast.error(e.message || 'Erro ao criar usuário');
    } finally {
      setSalvando(false);
    }
  };

  // FASE 2: cartão de acesso (compartilhar/copiar)
  if (criado) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Acesso criado"
        footer={
          <div className="space-y-2">
            <button
              onClick={() => enviarAcessoUI(criado)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition bg-emerald-500 text-slate-950"
            >
              <Share2 className="w-5 h-5" /> Enviar acesso ao usuário
            </button>
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-xs active:scale-[.99] transition bg-slate-800 text-slate-300 border border-slate-700"
            >
              Concluir
            </button>
          </div>
        }
      >
        <CartaoAcesso dados={criado} />
      </Sheet>
    );
  }

  // FASE 1: formulário
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo usuário"
      footer={
        <button
          onClick={criar}
          disabled={!valido || salvando}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition disabled:opacity-50 bg-amber-500 text-slate-950"
        >
          {!salvando && <UserPlus className="w-5 h-5" />}
          {salvando ? 'Criando…' : 'Criar usuário'}
        </button>
      }
    >
      <div className="space-y-4">
        <Campo label="Nome completo">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: João da Silva"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
        </Campo>
        <Campo label="Email" hint={!email || emailValido(email) ? null : 'Email inválido'}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="usuario@empresa.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
        </Campo>
        <Campo label="Cargo (opcional)">
          <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex.: Encarregado de montagem"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
        </Campo>
        <Campo label="Senha inicial" hint={senha.length < 6 ? 'Mínimo 6 caracteres' : 'Entregue esta senha ao usuário'}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input value={senha} onChange={e => setSenha(e.target.value)} type={verSenha ? 'text' : 'password'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-amber-500/50" />
              <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Ocultar' : 'Mostrar'}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400">
                {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="button" onClick={() => { setSenha(gerarSenha()); setVerSenha(true); }} aria-label="Gerar senha"
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-amber-400 active:scale-95 transition">
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </Campo>
        <Campo label="Função (preset de módulos)">
          <RoleSelector value={role} onChange={escolherRole} />
        </Campo>

        {/* Módulos liberados — a SELEÇÃO é o que vale para o acesso */}
        <div>
          <div className="text-[13px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Módulos liberados
          </div>
          {ehAdmin ? (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2.5 text-[12px] text-orange-300">
              Administrador tem acesso total a todos os módulos.
            </div>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mb-1">
                O usuário verá e editará <strong>somente</strong> os módulos marcados. A função acima apenas pré-seleciona — ajuste à vontade.
              </p>
              <MatrizPermissoes perms={perms} onToggle={togglePerm} />
              {permissoesSalvar.length === 0 && (
                <div className="text-[11px] text-amber-400/90 mt-1">Marque ao menos um módulo para liberar o acesso.</div>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ============================================================
// SHEET: EDITAR USUÁRIO (função, permissões, senha, status)
// ============================================================
function EditarUsuarioSheet({ open, user, ehVoce, podeGerenciar, onClose, onPatch }) {
  const [role, setRole] = useState('viewer');
  const [perms, setPerms] = useState([]);          // módulos liberados (fonte do acesso)
  const [novaSenha, setNovaSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resetando, setResetando] = useState(false);

  // Hidrata do usuário ao abrir: usa as permissões já gravadas; se não houver
  // (usuário legado herdando da função), pré-marca pelo preset da função atual.
  useEffect(() => {
    if (open && user) {
      setRole(user.role || 'viewer');
      const temCustom = Array.isArray(user.permissoes) && user.permissoes.length > 0;
      setPerms(temCustom ? [...user.permissoes].filter(p => p !== '*') : presetFuncao(user.role));
      setNovaSenha(''); setVerSenha(false);
    }
  }, [open, user]);

  if (!user) return <Sheet open={open} onClose={onClose} title="" />;

  const inativo = user.ativo === false;
  const ehAdmin = role === 'admin';

  // Trocar a função re-aplica o preset dela (atalho de seleção); admin = total.
  const escolherRole = (r) => { setRole(r); setPerms(r === 'admin' ? [] : presetFuncao(r)); };
  const togglePerm = (key) => {
    setPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const permissoesSalvar = ehAdmin ? [] : perms.filter(p => p !== '*');

  const salvar = async () => {
    if (salvando) return;
    if (!ehAdmin && permissoesSalvar.length === 0) { toast.error('Marque ao menos um módulo'); return; }
    setSalvando(true);
    try {
      // Acesso = SELEÇÃO explícita de módulos (não herda da função). Admin fica
      // com [] e herda o '*' do role admin no hasPermission.
      const permissoes = permissoesSalvar;
      const updates = { role, permissoes };
      const prof = await updateUserProfile(user.id, updates);
      hapticSuccess();
      onPatch?.(user.id, { role, permissoes });
      toast.success(`${user.nome || 'Usuário'} atualizado`);
      onClose?.();
      return prof;
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const alternarStatus = async () => {
    if (ehVoce) { toast.error('Você não pode desativar a própria conta'); return; }
    try {
      const novo = !inativo ? false : true; // inativo→ativar, ativo→desativar
      await toggleUserActive(user.id, novo);
      onPatch?.(user.id, { ativo: novo });
      toast.success(novo ? 'Usuário reativado' : 'Usuário desativado');
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Erro ao alterar status');
    }
  };

  // Redefine a senha. Se `enviar`, compartilha o cartão de acesso com a NOVA
  // senha em seguida (é o único momento com a senha em texto).
  const redefinirSenha = async (enviar = false) => {
    if (novaSenha.length < 6) { toast.error('Senha precisa de ao menos 6 caracteres'); return; }
    if (!user.auth_id) { toast.error('Usuário sem auth_id — não é possível redefinir'); return; }
    setResetando(true);
    try {
      await resetUserPassword(user.auth_id, novaSenha);
      hapticSuccess();
      if (enviar) {
        await enviarAcessoUI({ nome: user.nome, email: user.email, senha: novaSenha, role });
      } else {
        toast.success('Senha redefinida');
      }
      setNovaSenha(''); setVerSenha(false);
    } catch (e) {
      toast.error(e.message || 'Erro ao redefinir senha');
    } finally {
      setResetando(false);
    }
  };

  // Compartilha só o link + email + função (sem senha) — quando o usuário já
  // tem a senha. Para enviar senha, use "Redefinir e enviar".
  const enviarSoLink = () => enviarAcessoUI({ nome: user.nome, email: user.email, role });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={user.nome || user.email || 'Usuário'}
      footer={podeGerenciar && (
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition disabled:opacity-50 bg-emerald-500 text-slate-950"
        >
          {!salvando && <Check className="w-5 h-5" />}
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      )}
    >
      <div className="space-y-5">
        {/* Identificação */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg flex-shrink-0">
            {(user.nome || user.email || 'U').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {user.email}</div>
            {user.cargo && <div className="text-[11px] text-slate-500 truncate">{user.cargo}</div>}
            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${inativo ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
              {inativo ? 'Inativo' : 'Ativo'}
            </span>
          </div>
        </div>

        {!podeGerenciar && (
          <div className="bg-slate-800/60 rounded-xl px-3 py-2.5 text-[12px] text-slate-300">
            Você tem acesso de leitura. Apenas administradores podem editar.
          </div>
        )}

        {/* Função (preset de módulos) */}
        <Campo label="Função (preset de módulos)">
          <RoleSelector value={role} onChange={escolherRole} disabled={!podeGerenciar} />
        </Campo>

        {/* Módulos liberados — SELEÇÃO é o acesso real (não herda da função) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <div className="text-[13px] font-bold text-slate-200 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-400" /> Módulos liberados</div>
              <div className="text-[11px] text-slate-400">
                {ehAdmin ? 'Acesso total' : `O usuário vê/edita somente o marcado · ${permissoesSalvar.length} ativo(s)`}
              </div>
            </div>
            {!ehAdmin && podeGerenciar && (
              <button
                type="button"
                onClick={() => setPerms(presetFuncao(role))}
                className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 active:scale-95 transition"
              >
                Preset {roleLabel(role)}
              </button>
            )}
          </div>

          {ehAdmin ? (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2 text-[11px] text-orange-300">
              Administrador tem acesso total — a matriz de permissões não se aplica.
            </div>
          ) : (
            <MatrizPermissoes perms={perms} onToggle={togglePerm} disabled={!podeGerenciar} />
          )}
        </div>

        {podeGerenciar && (
          <>
            {/* Acesso do usuário — compartilhar link de entrada */}
            <Campo label="Acesso ao ERP">
              <button
                type="button"
                onClick={enviarSoLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm active:scale-[.99] transition"
              >
                <Share2 className="w-4 h-4 text-amber-400" /> Enviar link de acesso
              </button>
              <p className="text-[11px] text-slate-500 mt-1.5">Envia o link + email. Para incluir uma nova senha, use “Redefinir e enviar” abaixo.</p>
            </Campo>

            {/* Redefinir senha */}
            <Campo label="Redefinir senha">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type={verSenha ? 'text' : 'password'} placeholder="Nova senha (mín. 6)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-amber-500/50" />
                  <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Ocultar' : 'Mostrar'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400">
                    {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => { setNovaSenha(gerarSenha()); setVerSenha(true); }} aria-label="Gerar senha"
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-amber-400 active:scale-95 transition">
                  <Wand2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button type="button" onClick={() => redefinirSenha(false)} disabled={resetando || novaSenha.length < 6}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs active:scale-95 transition disabled:opacity-40">
                  <KeyRound className="w-4 h-4" /> {resetando ? '…' : 'Aplicar'}
                </button>
                <button type="button" onClick={() => redefinirSenha(true)} disabled={resetando || novaSenha.length < 6}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs active:scale-95 transition disabled:opacity-40">
                  <Send className="w-4 h-4" /> {resetando ? '…' : 'Redefinir e enviar'}
                </button>
              </div>
            </Campo>

            {/* Ativar / Desativar */}
            <button
              onClick={alternarStatus}
              disabled={ehVoce}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[.99] transition disabled:opacity-40 ${inativo ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}
            >
              <Power className="w-4 h-4" />
              {ehVoce ? 'Não é possível alterar sua própria conta' : (inativo ? 'Reativar usuário' : 'Desativar usuário')}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

// ============================================================
// CARTÃO DE ACESSO (mostrado após criar usuário)
// ============================================================
function CartaoAcesso({ dados }) {
  const url = urlAcesso(dados.email);
  const copiar = async (txt, label) => {
    try { await navigator.clipboard.writeText(txt); toast.success(`${label} copiado`); }
    catch { toast.error('Não foi possível copiar'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-300">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-bold">Usuário criado com sucesso</span>
      </div>
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Envie estes dados para o usuário. A senha aparece <strong>só agora</strong> —
        depois não é mais possível visualizá-la (apenas redefinir).
      </p>
      <CopyRow icon={Link2} label="Link de acesso" valor={url} onCopy={() => copiar(url, 'Link')} mono />
      <CopyRow icon={Mail} label="Email" valor={dados.email} onCopy={() => copiar(dados.email, 'Email')} />
      <CopyRow icon={KeyRound} label="Senha inicial" valor={dados.senha} onCopy={() => copiar(dados.senha, 'Senha')} mono />
      <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2">
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-[12px] text-slate-300">Função: <strong>{roleLabel(dados.role)}</strong></span>
      </div>
    </div>
  );
}

function CopyRow({ icon: Icon, label, valor, onCopy, mono }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm truncate ${mono ? 'font-mono' : ''}`}>
          {valor}
        </div>
        <button type="button" onClick={onCopy} aria-label={`Copiar ${label}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-amber-400 active:scale-95 transition flex-shrink-0">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTES DE UI
// ============================================================
function Stat({ label, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
      <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">{label}</div>
    </div>
  );
}

function Chip({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${ativo ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
    >
      {children}
    </button>
  );
}

function Campo({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</label>
        {hint && <span className="text-[11px] text-amber-400/80">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function RoleSelector({ value, onChange, disabled }) {
  return (
    <div className="space-y-1.5">
      {ROLE_ORDER.map(r => {
        const sel = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => !disabled && onChange(r)}
            disabled={disabled}
            className={`w-full text-left rounded-xl border p-2.5 flex items-center gap-2.5 transition ${sel ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-800 border-slate-700'} ${disabled ? 'opacity-60' : 'active:scale-[.99]'}`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'border-amber-400' : 'border-slate-500'}`}>
              {sel && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-100">{ROLE_META[r].label}</span>
              <span className="block text-[11px] text-slate-400 truncate">{ROLE_META[r].desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CheckBox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${checked ? 'bg-amber-500 border-amber-500' : 'bg-slate-800 border-slate-600'} ${disabled ? 'opacity-50' : ''}`}
    >
      {checked && <Check className="w-3.5 h-3.5 text-slate-950" strokeWidth={3} />}
    </button>
  );
}
