/**
 * GestaoUsuariosPage.jsx — Módulo Completo de Gestão de Usuários
 * MONTEX ERP V5 PREMIUM — Admin Only
 *
 * Tabs: Usuários · Senhas · Permissões · Links de Acesso · Auditoria
 * Persistência: user_profiles (Supabase) + entity_store (links + audit)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Key, Shield, Link2, FileText, Plus, Edit3, Trash2,
  Eye, EyeOff, RefreshCw, Copy, Check, AlertTriangle, Search,
  Calendar, Clock, Activity, Lock, Unlock, X, CheckCircle,
  XCircle, ChevronDown, Settings, UserCheck, UserX, Zap,
  ExternalLink, RotateCcw, Info, MoreVertical, Hash
} from 'lucide-react';
import { useAuth, ROLES, ROLE_LABELS, ROLE_COLORS } from '@/lib/AuthContext';
import { supabase, supabaseAdmin, getAllUserProfiles, updateUserProfile, createNewUser, toggleUserActive } from '@/api/supabaseClient';

// ============================================================
// HELPERS
// ============================================================

const fmt = (v) => new Intl.NumberFormat('pt-BR').format(v);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';
const fmtDateShort = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
  let pw = '';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  arr.forEach(b => { pw += chars[b % chars.length]; });
  return pw;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ============================================================
// SUPABASE HELPERS — entity_store
// ============================================================

async function saveEntityStore(entityType, data, id = null) {
  const client = supabaseAdmin || supabase;
  const record = {
    entity_type: entityType,
    data,
    created_date: new Date().toISOString(),
  };
  if (id) {
    const { data: upd, error } = await client
      .from('entity_store')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return upd;
  } else {
    const { data: ins, error } = await client
      .from('entity_store')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return ins;
  }
}

async function loadEntityStore(entityType) {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('entity_store')
    .select('*')
    .eq('entity_type', entityType)
    .order('created_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, ...row.data, _created: row.created_date }));
}

async function deleteEntityStore(id) {
  const client = supabaseAdmin || supabase;
  const { error } = await client.from('entity_store').delete().eq('id', id);
  if (error) throw error;
}

async function logAudit(action, details, currentUser) {
  try {
    await saveEntityStore('user_audit', {
      action,
      details,
      performed_by: currentUser?.email || 'admin',
      performed_by_name: currentUser?.nome || currentUser?.email || 'Admin',
      performed_at: new Date().toISOString(),
    });
  } catch (_) { /* silent */ }
}

// ============================================================
// ROLES & PERMISSIONS DATA
// ============================================================

const ALL_PERMISSIONS = [
  { key: 'dashboard.view', label: 'Dashboard — Visualizar' },
  { key: 'dashboard.export', label: 'Dashboard — Exportar' },
  { key: 'projetos.view', label: 'Projetos — Visualizar' },
  { key: 'projetos.edit', label: 'Projetos — Editar' },
  { key: 'projetos.create', label: 'Projetos — Criar' },
  { key: 'producao.view', label: 'Produção — Visualizar' },
  { key: 'producao.edit', label: 'Produção — Editar' },
  { key: 'producao.lancar_avanco', label: 'Produção — Lançar Avanço' },
  { key: 'producao.aprovar', label: 'Produção — Aprovar' },
  { key: 'estoque.view', label: 'Estoque — Visualizar' },
  { key: 'estoque.edit', label: 'Estoque — Editar' },
  { key: 'estoque.movimentar', label: 'Estoque — Movimentar' },
  { key: 'financeiro.view', label: 'Financeiro — Visualizar' },
  { key: 'financeiro.edit', label: 'Financeiro — Editar' },
  { key: 'financeiro.aprovar', label: 'Financeiro — Aprovar' },
  { key: 'orcamentos.view', label: 'Orçamentos — Visualizar' },
  { key: 'orcamentos.edit', label: 'Orçamentos — Editar' },
  { key: 'orcamentos.aprovar', label: 'Orçamentos — Aprovar' },
  { key: 'compras.view', label: 'Compras — Visualizar' },
  { key: 'compras.edit', label: 'Compras — Editar' },
  { key: 'compras.aprovar', label: 'Compras — Aprovar' },
  { key: 'medicao.view', label: 'Medição — Visualizar' },
  { key: 'medicao.edit', label: 'Medição — Editar' },
  { key: 'medicao.aprovar', label: 'Medição — Aprovar' },
  { key: 'equipes.view', label: 'Equipes — Visualizar' },
  { key: 'equipes.edit', label: 'Equipes — Editar' },
  { key: 'equipes.escalar', label: 'Equipes — Escalar' },
  { key: 'relatorios.view', label: 'Relatórios — Visualizar' },
  { key: 'relatorios.export', label: 'Relatórios — Exportar' },
  { key: 'bi.view', label: 'BI — Visualizar' },
  { key: 'usuarios.view', label: 'Usuários — Visualizar' },
  { key: 'usuarios.manage', label: 'Usuários — Gerenciar' },
];

const ROLE_PERMISSIONS_MAP = {
  admin: ['*'],
  gerente: ['dashboard.view','dashboard.export','projetos.view','projetos.edit','projetos.create','producao.view','producao.edit','producao.lancar_avanco','producao.aprovar','estoque.view','estoque.edit','estoque.movimentar','compras.view','compras.edit','compras.aprovar','medicao.view','medicao.edit','medicao.aprovar','equipes.view','equipes.edit','equipes.escalar','financeiro.view','financeiro.edit','orcamentos.view','orcamentos.edit','orcamentos.aprovar','relatorios.view','relatorios.export','bi.view','usuarios.view'],
  supervisor: ['dashboard.view','projetos.view','producao.view','producao.edit','producao.lancar_avanco','estoque.view','estoque.edit','estoque.movimentar','compras.view','medicao.view','medicao.edit','equipes.view','equipes.edit','equipes.escalar','relatorios.view'],
  operador: ['dashboard.view','producao.view','producao.lancar_avanco','estoque.view','equipes.view'],
  financeiro: ['dashboard.view','dashboard.export','projetos.view','financeiro.view','financeiro.edit','financeiro.aprovar','compras.view','compras.edit','orcamentos.view','orcamentos.edit','relatorios.view','relatorios.export'],
  viewer: ['dashboard.view','projetos.view','producao.view','relatorios.view'],
};

function hasRolePerm(role, permKey) {
  const perms = ROLE_PERMISSIONS_MAP[role] || [];
  return perms.includes('*') || perms.includes(permKey);
}

const ROLE_ORDER = ['admin', 'gerente', 'supervisor', 'financeiro', 'operador', 'viewer'];
const ROLE_BADGE = {
  admin: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  gerente: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  supervisor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  operador: 'bg-green-500/20 text-green-400 border border-green-500/30',
  financeiro: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  viewer: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const EXPIRY_OPTIONS = [
  { label: '1 dia', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
  { label: '15 dias', hours: 360 },
  { label: '30 dias', hours: 720 },
  { label: '90 dias', hours: 2160 },
  { label: 'Sem expiração', hours: null },
];

// ============================================================
// TOAST
// ============================================================
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
          ${t.type === 'error' ? 'bg-red-900/90 text-red-200 border border-red-700' :
            t.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700' :
            'bg-slate-800 text-slate-200 border border-slate-600'}`}>
          {t.type === 'success' ? <CheckCircle size={15}/> : t.type === 'error' ? <XCircle size={15}/> : <Info size={15}/>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ============================================================
// MODALS
// ============================================================

function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
            <X size={18}/>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required, hint, error, readOnly }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPass ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full bg-slate-800 border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all
            ${error ? 'border-red-500' : 'border-slate-600'}
            ${readOnly ? 'opacity-70 cursor-default' : ''}`}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white
          focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ============================================================
// MODAL: NOVO USUÁRIO
// ============================================================
function NovoUsuarioModal({ open, onClose, onSave, toast }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'operador', cargo: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome obrigatório';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'E-mail inválido';
    if (!form.senha || form.senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    if (!form.role) e.role = 'Perfil obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form);
      setForm({ nome: '', email: '', senha: '', role: 'operador', cargo: '' });
      onClose();
    } catch (err) {
      toast(err.message || 'Erro ao criar usuário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const genPw = () => setF('senha')(generatePassword());

  return (
    <Modal open={open} onClose={onClose} title="Novo Usuário">
      <InputField label="Nome Completo" value={form.nome} onChange={setF('nome')} placeholder="Ex: João da Silva" required error={errors.nome}/>
      <InputField label="E-mail" type="email" value={form.email} onChange={setF('email')} placeholder="joao@empresa.com" required error={errors.email}/>
      <div className="relative">
        <InputField label="Senha Inicial" type="password" value={form.senha} onChange={setF('senha')} placeholder="Mínimo 6 caracteres" required error={errors.senha}/>
        <button type="button" onClick={genPw} className="absolute right-0 top-0 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 py-1">
          <RefreshCw size={11}/> Gerar
        </button>
      </div>
      <InputField label="Cargo / Função" value={form.cargo} onChange={setF('cargo')} placeholder="Ex: Operador de Produção"/>
      <SelectField label="Perfil de Acesso" value={form.role} onChange={setF('role')} required
        options={ROLE_ORDER.map(r => ({ value: r, label: ROLE_LABELS[r] }))}/>
      <div className="flex gap-3 mt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition-all">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
          {loading ? 'Criando...' : 'Criar Usuário'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL: EDITAR USUÁRIO
// ============================================================
function EditarUsuarioModal({ open, onClose, user, onSave, toast }) {
  const [form, setForm] = useState({ nome: '', cargo: '', role: 'operador', obra_padrao: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ nome: user.nome || '', cargo: user.cargo || '', role: user.role || 'operador', obra_padrao: user.obra_padrao || '' });
  }, [user]);

  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(user.id, form);
      onClose();
    } catch (err) {
      toast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Editar: ${user?.nome || ''}`}>
      <div className="mb-4 px-3 py-2.5 bg-slate-800/50 rounded-lg text-sm text-slate-400">
        <span className="text-slate-500">E-mail:</span> <span className="text-slate-300">{user?.email}</span>
      </div>
      <InputField label="Nome Completo" value={form.nome} onChange={setF('nome')} placeholder="Nome completo"/>
      <InputField label="Cargo / Função" value={form.cargo} onChange={setF('cargo')} placeholder="Ex: Supervisor de Produção"/>
      <SelectField label="Perfil de Acesso" value={form.role} onChange={setF('role')}
        options={ROLE_ORDER.map(r => ({ value: r, label: ROLE_LABELS[r] }))}/>
      <div className="flex gap-3 mt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition-all">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// TAB 1: USUÁRIOS
// ============================================================
function TabUsuarios({ users, loading, onRefresh, toast, currentUser }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [novoOpen, setNovoOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toggling, setToggling] = useState(null);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.nome?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'ativo' ? u.ativo !== false : u.ativo === false);
    return matchSearch && matchRole && matchStatus;
  });

  const handleCreate = async (form) => {
    await createNewUser(form);
    await logAudit('create_user', `Usuário criado: ${form.email} (${form.role})`, currentUser);
    toast(`Usuário ${form.nome} criado com sucesso!`, 'success');
    onRefresh();
  };

  const handleEdit = async (id, updates) => {
    await updateUserProfile(id, updates);
    await logAudit('edit_user', `Usuário editado: ${updates.nome} — role: ${updates.role}`, currentUser);
    toast('Usuário atualizado!', 'success');
    onRefresh();
  };

  const handleToggle = async (u) => {
    setToggling(u.id);
    try {
      await toggleUserActive(u.id, !(u.ativo !== false));
      await logAudit('toggle_user', `Usuário ${u.email} ${u.ativo !== false ? 'desativado' : 'ativado'}`, currentUser);
      toast(`${u.nome} ${u.ativo !== false ? 'desativado' : 'ativado'}!`, 'success');
      onRefresh();
    } catch (err) {
      toast(err.message || 'Erro ao alterar status', 'error');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"/>
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
          <option value="all">Todos os perfis</option>
          {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
          <option value="all">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button onClick={() => setNovoOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all">
          <Plus size={15}/> Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: users.length, color: 'text-white' },
          { label: 'Ativos', value: users.filter(u => u.ativo !== false).length, color: 'text-emerald-400' },
          { label: 'Inativos', value: users.filter(u => u.ativo === false).length, color: 'text-red-400' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Usuário', 'Cargo', 'Perfil', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Nenhum usuário encontrado</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${ROLE_COLORS[u.role] || 'bg-slate-600'}`}>
                        {(u.nome || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{u.nome || '—'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.cargo || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${ROLE_BADGE[u.role] || 'bg-slate-700 text-slate-300'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${u.ativo !== false ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.ativo !== false ? 'bg-emerald-400' : 'bg-red-400'}`}/>
                      {u.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditUser(u)} title="Editar"
                        className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all">
                        <Edit3 size={14}/>
                      </button>
                      <button onClick={() => handleToggle(u)} disabled={toggling === u.id} title={u.ativo !== false ? 'Desativar' : 'Ativar'}
                        className={`p-1.5 rounded-lg transition-all ${u.ativo !== false ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                        {u.ativo !== false ? <UserX size={14}/> : <UserCheck size={14}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-700/30 text-xs text-slate-500">
          {filtered.length} de {users.length} usuários
        </div>
      </div>

      <NovoUsuarioModal open={novoOpen} onClose={() => setNovoOpen(false)} onSave={handleCreate} toast={toast}/>
      <EditarUsuarioModal open={!!editUser} onClose={() => setEditUser(null)} user={editUser} onSave={handleEdit} toast={toast}/>
    </div>
  );
}

// ============================================================
// TAB 2: SENHAS
// ============================================================
function TabSenhas({ users, toast, currentUser }) {
  const [selectedId, setSelectedId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const selectedUser = users.find(u => u.id === selectedId);

  const genPw = () => { setNewPw(generatePassword()); setShowPw(true); };

  const copyPw = async () => {
    if (!newPw) return;
    await navigator.clipboard.writeText(newPw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async () => {
    if (!selectedUser) { toast('Selecione um usuário', 'error'); return; }
    if (!newPw || newPw.length < 6) { toast('Senha deve ter no mínimo 6 caracteres', 'error'); return; }
    if (newPw !== confirmPw) { toast('As senhas não conferem', 'error'); return; }
    setLoading(true);
    try {
      // Use supabaseAdmin for auth operations
      const adminClient = supabaseAdmin || supabase;
      if (selectedUser.auth_id) {
        const { error } = await adminClient.auth.admin.updateUser(selectedUser.auth_id, { password: newPw });
        if (error) throw error;
      } else {
        // No auth_id stored — update via email
        const { error } = await adminClient.auth.admin.updateUser(selectedUser.id, { password: newPw });
        if (error) throw error;
      }
      await logAudit('reset_password', `Senha redefinida para: ${selectedUser.email}`, currentUser);
      toast(`Senha de ${selectedUser.nome || selectedUser.email} redefinida com sucesso!`, 'success');
      setNewPw(''); setConfirmPw(''); setSelectedId('');
    } catch (err) {
      toast(err.message || 'Erro ao redefinir senha', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5"/>
        <div className="text-sm text-amber-300">
          <div className="font-semibold mb-0.5">Atenção — Operação Administrativa</div>
          Ao redefinir a senha de um usuário, ele perderá o acesso atual imediatamente. Informe a nova senha por canal seguro.
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Selecionar Usuário <span className="text-red-400">*</span></label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            <option value="">— Escolha um usuário —</option>
            {users.filter(u => u.ativo !== false).map(u => (
              <option key={u.id} value={u.id}>{u.nome || u.email} ({ROLE_LABELS[u.role]})</option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <div className="flex items-center gap-3 mb-5 px-3 py-2.5 bg-slate-800 rounded-xl border border-slate-700">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${ROLE_COLORS[selectedUser.role] || 'bg-slate-600'}`}>
              {(selectedUser.nome || selectedUser.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{selectedUser.nome}</div>
              <div className="text-xs text-slate-500">{selectedUser.email} · {ROLE_LABELS[selectedUser.role]}</div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-300">Nova Senha <span className="text-red-400">*</span></label>
            <button onClick={genPw} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              <Zap size={11}/> Gerar Senha Segura
            </button>
          </div>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-20"/>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
              <button type="button" onClick={() => setShowPw(s => !s)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
              <button type="button" onClick={copyPw} disabled={!newPw} className="p-1.5 text-slate-400 hover:text-white rounded-lg disabled:opacity-30">
                {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
              </button>
            </div>
          </div>
          {newPw && (
            <div className="mt-1.5 flex gap-2 items-center text-xs">
              <div className="flex gap-1">
                {[6,8,10,12].map(len => (
                  <div key={len} className={`h-1 w-8 rounded-full transition-all ${newPw.length >= len ? 'bg-emerald-500' : 'bg-slate-700'}`}/>
                ))}
              </div>
              <span className="text-slate-500">{newPw.length < 6 ? 'Muito curta' : newPw.length < 8 ? 'Fraca' : newPw.length < 10 ? 'Média' : 'Forte'}</span>
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmar Senha <span className="text-red-400">*</span></label>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            placeholder="Repita a nova senha"
            className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50
              ${confirmPw && confirmPw !== newPw ? 'border-red-500' : 'border-slate-600'}`}/>
          {confirmPw && confirmPw !== newPw && <p className="text-xs text-red-400 mt-1">As senhas não conferem</p>}
        </div>

        <button onClick={handleReset} disabled={loading || !selectedId || !newPw || !confirmPw || newPw !== confirmPw}
          className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <><RefreshCw size={15} className="animate-spin"/> Redefinindo...</> : <><Key size={15}/> Redefinir Senha</>}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: PERMISSÕES
// ============================================================
function TabPermissoes({ users, onRefresh, toast, currentUser }) {
  const [view, setView] = useState('matrix'); // 'matrix' | 'users'
  const [editingRole, setEditingRole] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const handleChangeRole = async (userId, newRole, userName) => {
    setSavingId(userId);
    try {
      await updateUserProfile(userId, { role: newRole });
      await logAudit('change_role', `Perfil alterado para ${userName}: ${newRole}`, currentUser);
      toast(`Perfil de ${userName} alterado para ${ROLE_LABELS[newRole]}`, 'success');
      onRefresh();
    } catch (err) {
      toast(err.message || 'Erro ao alterar perfil', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[['matrix','Matriz de Permissões'],['users','Perfis por Usuário']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === v ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'matrix' && (
        <div className="overflow-x-auto">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden min-w-[700px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold w-48">Permissão</th>
                  {ROLE_ORDER.map(r => (
                    <th key={r} className="px-2 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${ROLE_BADGE[r]}`}>{ROLE_LABELS[r]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm, i) => (
                  <tr key={perm.key} className={`border-b border-slate-700/30 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="px-4 py-2.5 text-slate-400">{perm.label}</td>
                    {ROLE_ORDER.map(r => (
                      <td key={r} className="px-2 py-2.5 text-center">
                        {hasRolePerm(r, perm.key)
                          ? <CheckCircle size={14} className="mx-auto text-emerald-400"/>
                          : <XCircle size={14} className="mx-auto text-slate-700"/>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">* Permissões definidas por perfil. Para personalizar, altere o perfil do usuário.</p>
        </div>
      )}

      {view === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${ROLE_COLORS[u.role] || 'bg-slate-600'}`}>
                {(u.nome || u.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{u.nome || '—'}</div>
                <div className="text-xs text-slate-500 truncate">{u.email}</div>
              </div>
              <select
                value={u.role || 'viewer'}
                onChange={e => handleChangeRole(u.id, e.target.value, u.nome || u.email)}
                disabled={savingId === u.id}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50">
                {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              {savingId === u.id && <RefreshCw size={14} className="text-orange-400 animate-spin shrink-0"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 4: LINKS DE ACESSO
// ============================================================
function TabLinksAcesso({ toast, currentUser }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadEntityStore('access_link');
      setLinks(data);
    } catch (err) {
      toast('Erro ao carregar links: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleCopy = async (link) => {
    const url = `${window.location.origin}?view_token=${link.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
    // Increment visits
    try {
      await saveEntityStore('access_link', { ...link, last_copied: new Date().toISOString() }, link.id);
    } catch (_) {}
  };

  const handleRevoke = async (link) => {
    if (!confirm(`Revogar link "${link.label}"? Ele deixará de funcionar imediatamente.`)) return;
    try {
      await saveEntityStore('access_link', { ...link, active: false, revoked_at: new Date().toISOString() }, link.id);
      await logAudit('revoke_link', `Link revogado: ${link.label} (${link.token.slice(0,8)}...)`, currentUser);
      toast(`Link "${link.label}" revogado`, 'success');
      loadLinks();
    } catch (err) {
      toast(err.message || 'Erro ao revogar', 'error');
    }
  };

  const handleDelete = async (link) => {
    if (!confirm(`Excluir link "${link.label}" permanentemente?`)) return;
    try {
      await deleteEntityStore(link.id);
      await logAudit('delete_link', `Link excluído: ${link.label}`, currentUser);
      toast('Link excluído', 'success');
      loadLinks();
    } catch (err) {
      toast(err.message || 'Erro ao excluir', 'error');
    }
  };

  const handleCreate = async (form) => {
    const token = generateToken();
    const expiresAt = form.expiry_hours
      ? new Date(Date.now() + form.expiry_hours * 3600000).toISOString()
      : null;
    await saveEntityStore('access_link', {
      token,
      label: form.label,
      description: form.description,
      pages: form.pages,
      expires_at: expiresAt,
      active: true,
      visits: 0,
      created_by: currentUser?.email,
      created_by_name: currentUser?.nome || currentUser?.email,
      created_at: new Date().toISOString(),
    });
    await logAudit('create_link', `Link criado: ${form.label} — expira: ${expiresAt || 'nunca'}`, currentUser);
    toast(`Link "${form.label}" criado com sucesso!`, 'success');
    setCreateOpen(false);
    loadLinks();
  };

  const activeLinks = links.filter(l => l.active !== false && !isExpired(l.expires_at));
  const expiredLinks = links.filter(l => isExpired(l.expires_at));
  const revokedLinks = links.filter(l => l.active === false);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-3 text-sm text-slate-400">
          <span className="text-emerald-400 font-semibold">{activeLinks.length} ativos</span>
          <span>·</span>
          <span className="text-amber-400">{expiredLinks.length} expirados</span>
          <span>·</span>
          <span className="text-red-400">{revokedLinks.length} revogados</span>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all">
          <Plus size={15}/> Novo Link
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando links...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          <Link2 size={32} className="mx-auto text-slate-700 mb-3"/>
          <p className="text-slate-500">Nenhum link de acesso criado ainda</p>
          <p className="text-slate-600 text-xs mt-1">Crie links compartilháveis com controle de expiração</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const expired = isExpired(link.expires_at);
            const revoked = link.active === false;
            const status = revoked ? 'revogado' : expired ? 'expirado' : 'ativo';
            const statusColor = { ativo: 'text-emerald-400', expirado: 'text-amber-400', revogado: 'text-red-400' }[status];
            const statusBg = { ativo: 'bg-emerald-500/10 border-emerald-500/30', expirado: 'bg-amber-500/10 border-amber-500/30', revogado: 'bg-red-500/10 border-red-500/30' }[status];

            return (
              <div key={link.id} className={`border rounded-xl p-4 ${statusBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{link.label}</span>
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full border ${statusBg} ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                    {link.description && <p className="text-xs text-slate-400 mb-2">{link.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Hash size={11}/> {link.token?.slice(0, 12)}...</span>
                      <span className="flex items-center gap-1"><Calendar size={11}/> Criado {fmtDateShort(link.created_at || link._created)}</span>
                      {link.expires_at && <span className={`flex items-center gap-1 ${expired ? 'text-amber-400' : ''}`}><Clock size={11}/> Expira {fmtDateShort(link.expires_at)}</span>}
                      {!link.expires_at && <span className="flex items-center gap-1 text-slate-600"><Clock size={11}/> Sem expiração</span>}
                      <span className="flex items-center gap-1"><Activity size={11}/> {link.visits || 0} acessos</span>
                    </div>
                    {link.pages?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {link.pages.map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-slate-800/60 rounded text-slate-400 text-xs">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {status === 'ativo' && (
                      <>
                        <button onClick={() => handleCopy(link)} title="Copiar link"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all">
                          {copiedId === link.id ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                        </button>
                        <button onClick={() => handleRevoke(link)} title="Revogar"
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all">
                          <Lock size={14}/>
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(link)} title="Excluir"
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CriarLinkModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} toast={toast}/>
    </div>
  );
}

const AVAILABLE_MODULES = [
  'Dashboard', 'Produção', 'Kanban', 'Estoque', 'Financeiro',
  'Orçamentos', 'Medição', 'Expedição', 'BI & Analytics', 'Compras',
  'Equipes', 'Relatórios', 'Projetos',
];

function CriarLinkModal({ open, onClose, onSave, toast }) {
  const [form, setForm] = useState({ label: '', description: '', expiry_hours: 168, pages: [] });
  const [loading, setLoading] = useState(false);
  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const togglePage = (page) => {
    setForm(p => ({
      ...p,
      pages: p.pages.includes(page) ? p.pages.filter(x => x !== page) : [...p.pages, page]
    }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast('Informe um nome para o link', 'error'); return; }
    setLoading(true);
    try {
      await onSave(form);
      setForm({ label: '', description: '', expiry_hours: 168, pages: [] });
    } catch (err) {
      toast(err.message || 'Erro ao criar link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Criar Link de Acesso" width="max-w-xl">
      <InputField label="Nome do Link" value={form.label} onChange={setF('label')} placeholder="Ex: Visualização Cliente ABC" required/>
      <InputField label="Descrição (opcional)" value={form.description} onChange={setF('description')} placeholder="Para que serve este link?"/>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiração</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map(opt => (
            <button key={opt.label} onClick={() => setF('expiry_hours')(opt.hours)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${form.expiry_hours === opt.hours ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">Módulos visíveis <span className="text-slate-600 font-normal">(deixe vazio para acesso total)</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AVAILABLE_MODULES.map(mod => (
            <button key={mod} onClick={() => togglePage(mod)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border text-left ${form.pages.includes(mod) ? 'bg-orange-600/20 border-orange-500/50 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              {form.pages.includes(mod) && <Check size={10} className="inline mr-1"/>}{mod}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition-all">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
          {loading ? 'Criando...' : 'Criar Link'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// TAB 5: AUDITORIA
// ============================================================
const AUDIT_ICONS = {
  create_user: <Plus size={14} className="text-emerald-400"/>,
  edit_user: <Edit3 size={14} className="text-blue-400"/>,
  toggle_user: <UserCheck size={14} className="text-amber-400"/>,
  reset_password: <Key size={14} className="text-orange-400"/>,
  change_role: <Shield size={14} className="text-purple-400"/>,
  create_link: <Link2 size={14} className="text-cyan-400"/>,
  revoke_link: <Lock size={14} className="text-red-400"/>,
  delete_link: <Trash2 size={14} className="text-red-500"/>,
};

const ACTION_LABELS = {
  create_user: 'Usuário criado',
  edit_user: 'Usuário editado',
  toggle_user: 'Status alterado',
  reset_password: 'Senha redefinida',
  change_role: 'Perfil alterado',
  create_link: 'Link criado',
  revoke_link: 'Link revogado',
  delete_link: 'Link excluído',
};

function TabAuditoria({ toast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadEntityStore('user_audit');
      setLogs(data);
    } catch (err) {
      toast('Erro ao carregar auditoria: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  const clearLogs = async () => {
    if (!confirm('Limpar todos os logs de auditoria? Esta ação não pode ser desfeita.')) return;
    try {
      await Promise.all(logs.map(l => deleteEntityStore(l.id)));
      setLogs([]);
      toast('Logs de auditoria limpos', 'success');
    } catch (err) {
      toast(err.message || 'Erro ao limpar logs', 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none flex-1">
          <option value="all">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition-all">
          <RefreshCw size={14}/> Atualizar
        </button>
        {logs.length > 0 && (
          <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/50 text-red-400 hover:text-red-300 rounded-xl text-sm transition-all">
            <Trash2 size={14}/> Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando auditoria...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto text-slate-700 mb-3"/>
          <p className="text-slate-500">Nenhum registro de auditoria encontrado</p>
          <p className="text-slate-600 text-xs mt-1">As ações administrativas serão registradas aqui</p>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Ação', 'Detalhes', 'Realizado por', 'Quando'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id || i} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {AUDIT_ICONS[log.action] || <Activity size={14} className="text-slate-400"/>}
                      <span className="text-white text-xs font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{log.details}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{log.performed_by_name || log.performed_by || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap" title={fmtDate(log.performed_at || log._created)}>
                    {timeAgo(log.performed_at || log._created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-slate-700/30 text-xs text-slate-500">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
const TABS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'senhas', label: 'Senhas', icon: Key },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'links', label: 'Links de Acesso', icon: Link2 },
  { id: 'auditoria', label: 'Auditoria', icon: FileText },
];

export default function GestaoUsuariosPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toasts, show: toast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUserProfiles();
      setUsers(data);
    } catch (err) {
      toast('Erro ao carregar usuários: ' + err.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Lock size={48} className="mx-auto text-red-500/50 mb-4"/>
          <h2 className="text-white text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-slate-500">Esta página é exclusiva para administradores do sistema.</p>
        </div>
      </div>
    );
  }

  const ActiveTab = activeTab;

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <Toast toasts={toasts}/>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center shadow-lg">
            <Users size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gestão de Usuários</h1>
            <p className="text-xs text-slate-500">Administração completa · {users.length} usuários cadastrados</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center
                ${isActive ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}>
              <Icon size={15}/>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        {activeTab === 'usuarios' && (
          <TabUsuarios users={users} loading={loadingUsers} onRefresh={loadUsers} toast={toast} currentUser={currentUser}/>
        )}
        {activeTab === 'senhas' && (
          <TabSenhas users={users} toast={toast} currentUser={currentUser}/>
        )}
        {activeTab === 'permissoes' && (
          <TabPermissoes users={users} onRefresh={loadUsers} toast={toast} currentUser={currentUser}/>
        )}
        {activeTab === 'links' && (
          <TabLinksAcesso toast={toast} currentUser={currentUser}/>
        )}
        {activeTab === 'auditoria' && (
          <TabAuditoria toast={toast}/>
        )}
      </div>
    </div>
  );
}
