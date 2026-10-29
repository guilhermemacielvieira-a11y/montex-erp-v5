// ============================================================
// MobileLayout — ADAPTADOR para telas secundárias antigas
// ============================================================
// O app da diretoria (src/mobile/app/Shell.jsx + kit) substituiu o layout
// antigo. Telas que ainda não foram reescritas (Usuários, Configurações,
// Diário de obra, Galeria, Estoque, Medição e as páginas desktop em
// DesktopWrap) continuam chamando <MobileLayout title back obraFilter>;
// este adaptador as coloca no cabeçalho novo (<Tela/>), dentro do Shell.
// A versão anterior completa ficou em MobileLayoutLegado.jsx só para
// referência e não é mais usada.
// ============================================================
import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { Tela, Esqueleto } from './kit';
import ObraSelector from './components/ObraSelector';

export default function MobileLayout({ children, title = 'Montex', back = false, onBack = null, obraFilter = false }) {
  const { dataSource, reloadPecas, reloadEstoque, reloadExpedicoes } = useERP() || {};
  const carregando = dataSource === 'loading';
  const atualizar = async () => {
    await Promise.all([reloadPecas?.(), reloadEstoque?.(), reloadExpedicoes?.()]);
  };
  return (
    <Tela
      titulo={title}
      voltar={onBack || (typeof back === 'string' ? back : (back ? true : '/m/mais'))}
      onRefresh={atualizar}
      semRecuo
      cabecalhoExtra={obraFilter && !carregando ? <ObraSelector /> : null}
    >
      {carregando ? <div className="px-4"><Esqueleto linhas={5} metricas={2} /></div> : children}
    </Tela>
  );
}
