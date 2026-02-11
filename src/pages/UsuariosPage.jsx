import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/lib/AuthContext';
import { getAllUserProfiles, updateUserProfile, createNewUser, toggleUserActive } from '@/api/supabaseClient';
import InviteUserModal from '@/components/admin/InviteUserModal';

// ============================================================
// PÁGINA DE GESTÃO DE USUÁRIOS - MONTEX ERP PREMIUM V5
// CRUD real com Supabase + Edição inline de nome/cargo
// ============================================================

const ROLES_OPTIONS = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'gerente', label: 'Gerente', desc: 'Gerencia produção, equipes e financeiro' },
  { value: 'supervisor', label: 'Supervisor', desc: 'Operações diárias de fábrica' },
  { value: 'operador', label: 'Operador', desc: 'Input de dados de produção' },
  { value: 'financeiro', label: 'Financeiro', desc: 'Módulos financeiros e comerciais' },
  { value: 'viewer', label: 'Visualização', desc: 'Somente leitura' },
];

const ROLE_BADGE_COLORS = {
  admin: 'bg-orange-100 text-orange-800 border-orange-300',
  gerente: 'bg-purple-100 text-purple-800 border-purple-300',
  supervisor: 'bg-blue-100 text-blue-800 border-blue-300',
  operador: 'bg-green-100 text-green-800 border-green-300',
  financeiro: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  viewer: 'bg-slate-100 text-slate-800 border-slate-300',
};

// ============================================================
// COMPONENTE: Modal de Edição de Usuário
// ============================================================
function EditUserModal({ user, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    nome: user?.nome || '',
    cargo: user?.cargo || '',
    role: user?.role || 'viewer',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Usuário
          </h3>
          <p className="text-blue-200 text-sm mt-1">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
              placeholder="Nome do usuário"
              required
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo</label>
            <input
              type="text"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
              placeholder="Ex: Gerente de Obras, Supervisor de Produção"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nível de Acesso</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 bg-white"
            >
              {ROLES_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Modal de Novo Usuário
// ============================================================
function NewUserModal({ onSave, onClose, saving }) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: 'Montex@2025',
    cargo: '',
    role: 'operador',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Novo Usuário
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo *</label>
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              placeholder="Nome completo" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              placeholder="email@grupomontex.com.br" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha Inicial</label>
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              placeholder="Senha inicial" required />
            <p className="text-xs text-slate-500 mt-1">O usuário poderá alterar depois do primeiro login.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo</label>
            <input type="text" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              placeholder="Ex: Encarregado de Produção" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nível de Acesso</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 bg-white">
              {ROLES_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors" disabled={saving}>
              Cancelar
            </button>
            <button type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={saving}>
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> Criar Usuário</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: Página de Usuários
// ============================================================
export default function UsuariosPage() {
  const { user: currentUser, isAdmin, hasPermission } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Carregar usuários
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUserProfiles();
      setUsuarios(data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Salvar edição
  const handleSaveEdit = async (id, updates) => {
    try {
      setSaving(true);
      await updateUserProfile(id, updates);
      setEditingUser(null);
      setSuccessMsg('Usuário atualizado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadUsers();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      setError('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Criar novo usuário
  const handleCreateUser = async (formData) => {
    try {
      setSaving(true);
      await createNewUser(formData);
      setShowNewUserModal(false);
      setSuccessMsg('Usuário criado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadUsers();
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      setError(err.message || 'Erro ao criar usuário.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle ativo/inativo
  const handleToggleActive = async (usuario) => {
    const newStatus = !usuario.ativo;
    const action = newStatus ? 'ativar' : 'desativar';

    if (!window.confirm(`Deseja ${action} o usuário "${usuario.nome}"?`)) return;

    try {
      await toggleUserActive(usuario.id, newStatus);
      setSuccessMsg(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadUsers();
    } catch (err) {
      setError('Erro ao alterar status do usuário.');
    }
  };

  // Contadores por role
  const counts = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.ativo).length,
    admin: usuarios.filter(u => u.role === 'admin').length,
    gerente: usuarios.filter(u => u.role === 'gerente').length,
    supervisor: usuarios.filter(u => u.role === 'supervisor').length,
    operador: usuarios.filter(u => u.role === 'operador').length,
    financeiro: usuarios.filter(u => u.role === 'financeiro').length,
    viewer: usuarios.filter(u => u.role === 'viewer').length,
  };

  const canEdit = isAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 mt-1">Gerencie acessos e permissões do sistema</p>
        </div>

        {canEdit && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Convidar Usuário
            </button>
            <button
              onClick={() => setShowNewUserModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Novo Usuário
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'from-slate-600 to-slate-700' },
          { label: 'Ativos', value: counts.ativos, color: 'from-emerald-600 to-emerald-700' },
          { label: 'Admin', value: counts.admin, color: 'from-orange-600 to-amber-700' },
          { label: 'Gerente', value: counts.gerente, color: 'from-purple-600 to-violet-700' },
          { label: 'Supervisor', value: counts.supervisor, color: 'from-blue-600 to-cyan-700' },
          { label: 'Operador', value: counts.operador, color: 'from-green-600 to-emerald-700' },
          { label: 'Financeiro', value: counts.financeiro, color: 'from-yellow-600 to-orange-700' },
          { label: 'Viewer', value: counts.viewer, color: 'from-slate-500 to-slate-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-3 text-center">
            <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Carregando usuários...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  {canEdit && (
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className={`hover:bg-blue-50/50 transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>
                    {/* Avatar + Nome */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${ROLE_COLORS[u.role] || 'bg-slate-500'} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                          {u.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{u.nome}</div>
                          {u.id === currentUser?.id && (
                            <span className="text-xs text-blue-600 font-medium">(Você)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 text-sm text-slate-600">{u.email}</td>

                    {/* Cargo */}
                    <td className="px-5 py-4 text-sm text-slate-600">{u.cargo || '—'}</td>

                    {/* Role Badge */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${ROLE_BADGE_COLORS[u.role] || 'bg-slate-100 text-slate-700'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${u.ativo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-2 rounded-lg transition-colors ${u.ativo ? 'text-red-600 hover:bg-red-100' : 'text-emerald-600 hover:bg-emerald-100'}`}
                              title={u.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {u.ativo ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && usuarios.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-lg font-medium">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      {/* Role Permission Matrix */}
      {canEdit && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Matriz de Permissões
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Módulo</th>
                  {ROLES_OPTIONS.map(r => (
                    <th key={r.value} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { mod: 'Dashboard', perms: ['view', 'view', 'view', 'view', 'view', 'view'] },
                  { mod: 'Produção', perms: ['full', 'full', 'edit', 'lancar', '—', 'view'] },
                  { mod: 'Estoque', perms: ['full', 'edit', 'edit', 'view', '—', 'view'] },
                  { mod: 'Financeiro', perms: ['full', 'edit', '—', '—', 'full', 'view'] },
                  { mod: 'Orçamentos', perms: ['full', 'edit', '—', '—', 'edit', '—'] },
                  { mod: 'Equipes', perms: ['full', 'edit', 'edit', 'view', '—', 'view'] },
                  { mod: 'Relatórios', perms: ['full', 'export', 'view', '—', 'export', 'view'] },
                  { mod: 'Usuários', perms: ['full', 'view', '—', '—', '—', '—'] },
                ].map(({ mod, perms }) => (
                  <tr key={mod} className="hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{mod}</td>
                    {perms.map((p, i) => (
                      <td key={i} className="text-center px-3 py-2.5">
                        {p === 'full' ? (
                          <span className="text-emerald-600 font-bold">Total</span>
                        ) : p === 'edit' ? (
                          <span className="text-blue-600">Editar</span>
                        ) : p === 'view' ? (
                          <span className="text-slate-400">Ver</span>
                        ) : p === 'lancar' ? (
                          <span className="text-amber-600">Lançar</span>
                        ) : p === 'export' ? (
                          <span className="text-purple-600">Exportar</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleSaveEdit}
          onClose={() => setEditingUser(null)}
          saving={saving}
        />
      )}
      {showNewUserModal && (
        <NewUserModal
          onSave={handleCreateUser}
          onClose={() => setShowNewUserModal(false)}
          saving={saving}
        />
      )}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setSuccessMsg('Usuário convidado com sucesso!');
          setTimeout(() => setSuccessMsg(''), 3000);
          loadUsers();
        }}
      />
    </div>
  );
}
