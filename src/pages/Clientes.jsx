import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';

const segmentos = [
  { value: 'industria', label: 'Indústria' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'logistica', label: 'Logística' },
  { value: 'agronegocio', label: 'Agronegócio' },
  { value: 'construcao_civil', label: 'Construção Civil' },
  { value: 'outro', label: 'Outro' }
];

export default function Clientes() {
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    segmento: 'industria',
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date', 100)
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData({
      nome: '',
      cnpj: '',
      contato: '',
      email: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      segmento: 'industria',
      observacoes: ''
    });
  };

  const openEditModal = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      cnpj: cliente.cnpj || '',
      contato: cliente.contato || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      segmento: cliente.segmento || 'industria',
      observacoes: cliente.observacoes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getProjetosCliente = (clienteNome) => {
    return projetos.filter(p => p.cliente_nome === clienteNome);
  };

  const getSegmentoLabel = (segmento) => {
    const config = segmentos.find(s => s.value === segmento);
    return config?.label || segmento;
  };

  const filteredClientes = clientes.filter(cliente => 
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie sua base de clientes</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredClientes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm ? 'Tente ajustar a busca' : 'Comece cadastrando seu primeiro cliente'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-orange-500 to-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente, index) => {
            const projetosCliente = getProjetosCliente(cliente.nome);
            return (
              <motion.div
                key={cliente.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-slate-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-600">
                            {cliente.nome?.charAt(0).toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{cliente.nome}</h3>
                          {cliente.segmento && (
                            <Badge variant="secondary" className="mt-1">
                              {getSegmentoLabel(cliente.segmento)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(cliente)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      {cliente.contato && (
                        <p className="text-slate-600">
                          <span className="text-slate-400">Contato:</span> {cliente.contato}
                        </p>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{cliente.email}</span>
                        </div>
                      )}
                      {cliente.telefone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{cliente.telefone}</span>
                        </div>
                      )}
                      {(cliente.cidade || cliente.estado) && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {projetosCliente.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-slate-900">
                            {projetosCliente.length} projeto{projetosCliente.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome / Razão Social *</Label>
                <Input
                  placeholder="Nome da empresa"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contato Principal</Label>
                <Input
                  placeholder="Nome do contato"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select
                  value={formData.segmento}
                  onValueChange={(value) => setFormData({ ...formData, segmento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentos.map((seg) => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                placeholder="Rua, número, bairro"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  placeholder="Cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o cliente..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.nome || createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}