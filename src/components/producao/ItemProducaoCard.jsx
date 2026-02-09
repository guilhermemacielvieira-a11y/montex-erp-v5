import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Pause } from 'lucide-react';
import GerenciadorMidias from './GerenciadorMidias';
import SeletorMaterialConsumido from './SeletorMaterialConsumido';
import { gerarNotificacoes } from './GeradorNotificacoes';
import { isAfter, parseISO } from 'date-fns';

export default function ItemProducaoCard({ item }) {
  const [quantidade, setQuantidade] = useState('');
  const [novoStatus, setNovoStatus] = useState(item.status);
  const [observacoes, setObservacoes] = useState('');
  const [expandido, setExpandido] = useState(false);
  const [midias, setMidias] = useState(item.midias || []);
  const [mostrarMateriais, setMostrarMateriais] = useState(false);
  const [materiaisConsumidos, setMateriaisConsumidos] = useState([]);

  // Verificar se está atrasado
  const estaAtrasado = item.data_fim_prevista && isAfter(new Date(), parseISO(item.data_fim_prevista));
  const estaPausado = item.status === 'pausado';

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const novaQtd = item.quantidade_produzida + parseInt(data.quantidade);
      const percentual = (novaQtd / item.quantidade) * 100;
      
      const novosDados = {
        quantidade_produzida: novaQtd,
        percentual_conclusao: Math.min(percentual, 100),
        status: data.status,
        observacoes: data.observacoes || item.observacoes
      };

      await base44.entities.ItemProducao.update(item.id, novosDados);

      // Registrar consumo de materiais
      if (data.materiais && data.materiais.length > 0) {
        for (const material of data.materiais) {
          // Criar registro de consumo
          await base44.entities.ConsumoDeMaterial.create({
            material_id: material.material_id,
            material_nome: material.material_nome,
            item_producao_id: item.id,
            item_nome: item.nome,
            projeto_id: item.projeto_id,
            projeto_nome: item.projeto_nome,
            quantidade_consumida: material.quantidade,
            unidade: material.unidade,
            valor_unitario: material.valor_unitario,
            valor_total: material.quantidade * material.valor_unitario,
            data_consumo: new Date().toISOString().split('T')[0],
            etapa: item.etapa
          });

          // Atualizar estoque do material
          const materialAtual = await base44.entities.Material.list();
          const mat = materialAtual.find(m => m.id === material.material_id);
          if (mat) {
            await base44.entities.Material.update(material.material_id, {
              quantidade_estoque: Math.max(0, mat.quantidade_estoque - material.quantidade)
            });
          }
        }
      }

      // Gerar notificações automaticamente após atualização
      await gerarNotificacoes(
        { ...item, ...novosDados },
        item.responsavel
      );
    },
    onSuccess: () => {
      toast.success('Produção registrada e estoque atualizado!');
      setQuantidade('');
      setObservacoes('');
      setExpandido(false);
      setMostrarMateriais(false);
      setMateriaisConsumidos([]);
    },
    onError: () => {
      toast.error('Erro na atualização');
    }
  });

  const handleMaterialAdicionado = (materiais) => {
    setMateriaisConsumidos(materiais);
    setMostrarMateriais(false);
  };

  const handleSubmit = () => {
    if (!quantidade || quantidade <= 0) {
      toast.error('Quantidade inválida');
      return;
    }
    if (parseInt(quantidade) + item.quantidade_produzida > item.quantidade) {
      toast.error('Quantidade excede o total');
      return;
    }
    updateMutation.mutate({
      quantidade,
      status: novoStatus,
      observacoes,
      materiais: materiaisConsumidos
    });
  };

  const statusColors = {
    pendente: 'bg-slate-100 text-slate-800',
    em_andamento: 'bg-blue-100 text-blue-800',
    concluido: 'bg-green-100 text-green-800',
    pausado: 'bg-orange-100 text-orange-800'
  };

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all ${
      estaAtrasado ? 'border-red-300 border-2' : estaPausado ? 'border-orange-300 border-2' : ''
    }`}>
      {/* Alerta de Atraso ou Pausa */}
      {(estaAtrasado || estaPausado) && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm ${
          estaAtrasado ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {estaAtrasado ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Atraso previsto!</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              <span className="font-medium">Produção pausada</span>
            </>
          )}
        </div>
      )}

      <CardHeader className={`pb-3 ${
        estaAtrasado ? 'bg-gradient-to-r from-red-50 to-red-100' : 
        estaPausado ? 'bg-gradient-to-r from-orange-50 to-orange-100' :
        'bg-gradient-to-r from-blue-50 to-blue-100'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.nome}</CardTitle>
            {item.codigo && <p className="text-xs text-slate-500 mt-1">Código: {item.codigo}</p>}
          </div>
          <Badge className={statusColors[item.status]}>
            {item.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-slate-50 p-2 rounded">
            <p className="text-slate-500 text-xs">Total</p>
            <p className="font-bold">{item.quantidade}</p>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-blue-600 text-xs">Produzido</p>
            <p className="font-bold">{item.quantidade_produzida}</p>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <p className="text-green-600 text-xs">Faltam</p>
            <p className="font-bold">{item.quantidade - item.quantidade_produzida}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium">Progresso</p>
            <span className="text-sm font-bold text-blue-600">{item.percentual_conclusao.toFixed(1)}%</span>
          </div>
          <Progress value={item.percentual_conclusao} className="h-2" />
        </div>

        {/* Dates */}
        {item.data_inicio || item.data_fim_prevista && (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            {item.data_inicio && <p>Início: {item.data_inicio}</p>}
            {item.data_fim_prevista && <p>Previsto: {item.data_fim_prevista}</p>}
          </div>
        )}

        {/* Mídias Adicionadas */}
        {midias.length > 0 && !expandido && (
          <div className="grid grid-cols-3 gap-1">
            {midias.slice(0, 3).map((media, idx) => (
              <div key={idx} className="aspect-square bg-slate-100 rounded overflow-hidden">
                {media.tipo === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <span className="text-white text-xs">VID</span>
                  </div>
                ) : (
                  <img src={media.url} alt="Mídia" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
            {midias.length > 3 && (
              <div className="aspect-square bg-slate-200 rounded flex items-center justify-center text-xs font-bold">
                +{midias.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Observações existentes */}
        {item.observacoes && !expandido && (
          <p className="text-xs bg-yellow-50 p-2 rounded text-yellow-800">
            <strong>Nota:</strong> {item.observacoes.substring(0, 100)}...
          </p>
        )}

        {/* Form de atualização */}
        {expandido && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-xs font-medium">Quantidade a Registrar</label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Status</label>
              <Select value={novoStatus} onValueChange={setNovoStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium">Observação</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Problemas ou notas..."
                className="w-full text-xs p-2 border rounded mt-1"
                rows="2"
              />
            </div>

            {!mostrarMateriais && (
              <Button
                onClick={() => setMostrarMateriais(true)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                + Adicionar Consumo de Material
              </Button>
            )}

            {mostrarMateriais && (
              <SeletorMaterialConsumido
                item={item}
                onMaterialAdicionado={handleMaterialAdicionado}
              />
            )}

            {materiaisConsumidos.length > 0 && (
              <div className="bg-green-50 p-2 rounded border border-green-200">
                <p className="text-xs font-medium text-green-800 mb-2">Materiais a consumir:</p>
                {materiaisConsumidos.map((m, idx) => (
                  <p key={idx} className="text-xs text-green-700">
                    • {m.material_nome}: {m.quantidade} {m.unidade}
                  </p>
                ))}
              </div>
            )}

            <GerenciadorMidias 
              item={item} 
              onMediasUpdated={setMidias}
            />

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {updateMutation.isPending ? 'Atualizando...' : <><Plus className="w-4 h-4 mr-1" /> Registrar</>}
              </Button>
              <Button
                onClick={() => setExpandido(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Botão de expand */}
        {!expandido && (
          <Button
            onClick={() => setExpandido(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Produção
          </Button>
        )}
      </CardContent>
    </Card>
  );
}