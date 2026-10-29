// ============================================================
// PERFIL — app da diretoria (/m/perfil)
// ============================================================
// Dados do usuário, papel, notificações push (mesmo fluxo de
// ConfiguracoesMobile: getPushStatus/enablePush com contexto { role }) e Sair.
// ============================================================
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Mail, Shield, Briefcase, Building2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isPushAvailable, getPushStatus, enablePush } from '../ui/push';
import { Tela, Secao, Grupo, Linha, Status, Botao } from '../kit';

const iniciais = (nome) => String(nome || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'M';

function textoPush(status) {
  if (status === 'granted') return 'Você recebe avisos de aprovação, peça pronta e alertas';
  if (status === 'denied') return 'Permissão negada nos Ajustes do aparelho';
  if (status === 'indisponivel') return 'Disponível no app instalado';
  if (status === null) return 'Verificando';
  return 'Toque em Ativar para receber avisos';
}

export default function Perfil() {
  const { user, logout, ROLE_LABELS } = useAuth() || {};
  const nome = user?.nome || user?.name || user?.full_name || 'Usuário';
  const papel = (ROLE_LABELS && user?.role && ROLE_LABELS[user.role]) || user?.role || '—';
  const [push, setPush] = useState(null);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    let vivo = true;
    getPushStatus().then((s) => { if (vivo) setPush(s); });
    return () => { vivo = false; };
  }, []);

  const ativarPush = async () => {
    setAtivando(true);
    try {
      const r = await enablePush((notif) => {
        toast(notif?.title || 'Nova notificação');
      }, { role: user?.role || null });
      if (r.ok) { toast.success('Notificações ativadas'); setPush('granted'); }
      else if (r.reason === 'indisponivel') toast('Disponível só no app instalado');
      else if (r.reason === 'negado') { toast.error('Permissão negada. Habilite nos Ajustes do aparelho.'); setPush('denied'); }
      else toast.error('Não foi possível ativar');
    } finally {
      setAtivando(false);
    }
  };

  const tomPush = push === 'granted' ? 'ok' : push === 'denied' ? 'bad' : 'neutro';

  return (
    <Tela titulo="Perfil" voltar="/m/mais">
      <div className="flex flex-col items-center pt-6 text-center">
        <span className="mx-num flex h-20 w-20 items-center justify-center rounded-full bg-mx-teal text-[28px] text-white" aria-hidden>
          {iniciais(nome)}
        </span>
        <h2 className="mx-titulo mt-3 text-[22px] text-mx-text">{nome}</h2>
        {user?.cargo && <p className="text-[14px] text-mx-text2">{user.cargo}</p>}
      </div>

      <Secao titulo="Conta">
        <Grupo>
          <Linha icone={Mail} titulo="Email" sub={user?.email || '—'} />
          <Linha icone={Shield} titulo="Papel no sistema" sub={papel} />
          {user?.cargo && <Linha icone={Briefcase} titulo="Cargo" sub={user.cargo} />}
          {user?.obraPadrao && <Linha icone={Building2} titulo="Obra padrão" sub={user.obraPadrao} />}
        </Grupo>
      </Secao>

      <Secao titulo="Notificações">
        <Grupo>
          <Linha
            icone={Bell}
            iconeTom={push === 'granted' ? 'ok' : 'teal'}
            titulo="Notificações push"
            sub={textoPush(push)}
            direita={push === 'granted' || push === 'denied' || push === 'indisponivel'
              ? <Status tom={tomPush}>{push === 'granted' ? 'Ativas' : push === 'denied' ? 'Negadas' : 'Indisponível'}</Status>
              : (
                <Botao variante="secundario" className="h-9 px-3 text-[14px]" onClick={ativarPush} carregando={ativando} disabled={push === null}>
                  Ativar
                </Botao>
              )}
          />
        </Grupo>
        {!isPushAvailable() && (
          <p className="mt-2 px-1 text-[12px] text-mx-text3">No navegador o aviso chega pelo sino de alertas. Push exige o app instalado.</p>
        )}
      </Secao>

      <Secao titulo="Aparelho">
        <Grupo>
          <Linha to="/m/config" icone={Settings} titulo="Configurações" sub="Sincronização e envios pendentes" />
        </Grupo>
      </Secao>

      <Botao variante="perigo" icone={LogOut} className="mt-8 w-full" onClick={() => logout?.()}>
        Sair da conta
      </Botao>
    </Tela>
  );
}
