import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { X, UserPlus, Mail, Shield, Building2, Briefcase, AlertCircle, CheckCircle } from 'lucide-react';

const ROLES = [
  { value: 'viewer', label: 'Visualização', desc: 'Somente leitura' },
  { value: 'operador', label: 'Operador', desc: 'Input de dados de produção' },
  { value: 'financeiro', label: 'Financeiro', desc: 'Módulos financeiros' },
  { value: 'supervisor', label: 'Supervisor', desc: 'Operações diárias' },
  { value: 'gerente', label: 'Gerente', desc: 'Gerencia geral' },
  { value: 'admin', label: 'Administrador', desc: 'Acesso total' },
];

export default function InviteUserModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    role: 'operador',
    cargo: '',
    departamento: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      // Validação básica
      if (!form.nome.trim()) {
        throw new Error('Nome é obrigatório');
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        throw new Error('Email válido é obrigatório');
      }

      // 1. Gerar senha temporária aleatória
      const tempPassword = `TempPass${Date.now()}@${Math.random().toString(36).substring(0, 8)}`;

      // 2. Criar usuário via signUp (isso cria um auth user sem confirmar email ainda)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: tempPassword,
        options: {
          data: {
            nome: form.nome,
            role: form.role,
            cargo: form.cargo,
            departamento: form.departamento,
          },
        },
      });

      if (signUpError) throw signUpError;

      const authUserId = signUpData?.user?.id;
      if (!authUserId) {
        throw new Error('Falha ao criar usuário de autenticação');
      }

      // 3. Inserir no user_profiles com o auth_id gerado
      const { error: profileError } = await supabase.from('user_profiles').insert([
        {
          auth_id: authUserId,
          nome: form.nome.trim(),
          email: form.email.trim(),
          role: form.role,
          cargo: form.cargo.trim() || null,
          departamento: form.departamento.trim() || null,
          ativo: true,
        },
      ]);

      if (profileError) throw profileError;

      // 4. Enviar email de reset de senha para o usuário definir sua própria senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      // Sucesso!
      setSuccess(true);
      setSuccessMessage(
        `Usuário convidado com sucesso! Um email foi enviado para ${form.email} com instruções para definir a senha.`
      );

      // Limpar form
      setForm({
        nome: '',
        email: '',
        role: 'operador',
        cargo: '',
        departamento: '',
      });

      // Chamar callback de sucesso (recarregar lista de usuários)
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Erro ao convidar usuário:', err);
      setError(err.message || 'Erro ao convidar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      nome: '',
      email: '',
      role: 'operador',
      cargo: '',
      departamento: '',
    });
    setError(null);
    setSuccess(false);
    setSuccessMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Usuário
          </h3>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium">Convite enviado com sucesso!</p>
                <p className="text-emerald-300/80 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Erro</p>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ex: João Silva"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="joao@grupomontex.com.br"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Nível de Acesso *
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ex: Gerente de Obras"
                    disabled={loading}
                  />
                </div>

                {/* Departamento */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Departamento
                  </label>
                  <input
                    type="text"
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ex: Produção, Financeiro, etc"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300/90">
                  Um email será enviado para <span className="font-medium text-blue-200">{form.email || 'o email fornecido'}</span> com um link para definir a senha inicial.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Enviar Convite
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
