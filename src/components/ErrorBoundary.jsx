import React from 'react';

/**
 * Error Boundary Global - Captura erros de renderização do React
 * Previne tela branca e mostra interface amigável de erro
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log para debug - em produção, enviar para serviço de monitoramento
    console.error('[ErrorBoundary] Erro capturado:', error);
    console.error('[ErrorBoundary] Info:', errorInfo?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = () => {
    try {
      // Limpar estado corrompido do localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('montex-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 max-w-lg w-full p-8 text-center">
            {/* Ícone */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Título */}
            <h2 className="text-white text-xl font-bold mb-2">
              Algo deu errado
            </h2>

            <p className="text-blue-200/70 text-sm mb-6">
              Um erro inesperado ocorreu. Tente recarregar a página ou voltar ao início.
            </p>

            {/* Detalhes do erro (colapsável) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-blue-300/50 text-xs cursor-pointer hover:text-blue-300 transition-colors">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-red-300/70 text-xs overflow-auto max-h-32 border border-slate-700/30">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack?.slice(0, 500)}
                </pre>
              </details>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Recarregar
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Ir ao Início
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg font-medium transition-colors text-sm"
              >
                Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
