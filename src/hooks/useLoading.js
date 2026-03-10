import { useState, useEffect } from 'react';
import { useERP } from '../contexts/ERPContext';

/**
 * Hook para gerenciar estado de loading de páginas
 * Conecta-se ao loading global do ERPContext
 */
export function usePageLoading(dependencies = []) {
  const { loading: globalLoading } = useERP();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!globalLoading) {
      // Small delay for smooth transition
      const timer = setTimeout(() => setIsReady(true), 150);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [globalLoading, ...dependencies]);

  return { isLoading: globalLoading || !isReady, isReady };
}

export default usePageLoading;
