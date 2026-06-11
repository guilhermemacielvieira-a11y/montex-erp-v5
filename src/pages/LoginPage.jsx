import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Lock, Mail, HardHat } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoadingAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Pre-preenche o email quando o admin envia o link de acesso (?email=...).
  const [email, setEmail] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('email') || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Se já está autenticado (visitou /login direto após login OK), redireciona para home
  useEffect(() => {
    if (isAuthenticated) {
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      // Traduzir erros comuns do Supabase
      const msg = result.error || 'Erro desconhecido';
      if (msg.includes('Invalid login')) {
        setError('Email ou senha incorretos');
      } else if (msg.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError(msg);
      }
    } else {
      // Login OK — navegar para home imediatamente (não esperar re-render passivo)
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(14,165,233,0.2) 0%, transparent 50%)'
        }} />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700/50 bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <HardHat className="h-9 w-9 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            MONTEX ERP
          </CardTitle>
          <CardDescription className="text-slate-500">
            Sistema de Gestão de Produção em Estrutura Metálica
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Botão Login */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium h-11"
              disabled={isLoading || isLoadingAuth}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-center mt-3">
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                Esqueceu a senha?
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-slate-400">
              MONTEX ERP Premium v5.0
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Obra: SUPER LUNA — Belo Vale/MG
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
