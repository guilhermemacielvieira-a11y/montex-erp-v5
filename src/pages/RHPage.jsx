import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Clock,
  DollarSign,
  Search,
  Download,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Edit,
  Eye,
  Timer,
  LogIn,
  LogOut,
  Coffee,
  GraduationCap,
  Heart,
  Plane,
  Calendar as CalendarIcon
} from 'lucide-react';

// Dados - Será preenchido com dados reais
const mockFuncionarios = [
  { id: 1, nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', departamento: 'Produção', admissao: '2023-01-15', salario: 3322, status: 'ativo', email: 'cristiane@montex.com.br', telefone: '(31) 99801-1001', cpf: '123.456.789-01', jornada: '44h', contrato: 'CLT' },
  { id: 2, nome: 'Diego Alves da Silva', cargo: 'Montador I', departamento: 'Produção', admissao: '2022-06-01', salario: 4628, status: 'ativo', email: 'diego@montex.com.br', telefone: '(31) 99801-1002', cpf: '123.456.789-02', jornada: '44h', contrato: 'CLT' },
  { id: 3, nome: 'David Barbosa de Souza', cargo: 'Coordenador de Produção', departamento: 'Produção', admissao: '2019-03-10', salario: 4388, status: 'ativo', email: 'david@montex.com.br', telefone: '(31) 99801-1003', cpf: '123.456.789-03', jornada: '44h', contrato: 'CLT' },
  { id: 4, nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', departamento: 'Produção', admissao: '2022-08-15', salario: 5217, status: 'ativo', email: 'eder@montex.com.br', telefone: '(31) 99801-1004', cpf: '123.456.789-04', jornada: '44h', contrato: 'CLT' },
  { id: 5, nome: 'Derlei Gobbi', cargo: 'Montador I', departamento: 'Produção', admissao: '2021-11-20', salario: 3500, status: 'ativo', email: 'derlei@montex.com.br', telefone: '(31) 99801-1005', cpf: '123.456.789-05', jornada: '44h', contrato: 'CLT' },
  { id: 6, nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', departamento: 'Produção', admissao: '2023-02-01', salario: 2800, status: 'ativo', email: 'erick@montex.com.br', telefone: '(31) 99801-1006', cpf: '123.456.789-06', jornada: '44h', contrato: 'CLT' },
  { id: 7, nome: 'Flavio da Cruz', cargo: 'Instalador Esquadrias Alumínio', departamento: 'Produção', admissao: '2020-05-10', salario: 6623, status: 'ativo', email: 'flavio.cruz@montex.com.br', telefone: '(31) 99801-1007', cpf: '123.456.789-07', jornada: '44h', contrato: 'CLT' },
  { id: 8, nome: 'Flavio de Jesus Santos', cargo: 'Líder de Produção', departamento: 'Produção', admissao: '2018-09-01', salario: 5559, status: 'ativo', email: 'flavio.santos@montex.com.br', telefone: '(31) 99801-1008', cpf: '123.456.789-08', jornada: '44h', contrato: 'CLT' },
  { id: 9, nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', departamento: 'Produção', admissao: '2017-06-15', salario: 6411, status: 'ativo', email: 'gilmar@montex.com.br', telefone: '(31) 99801-1009', cpf: '123.456.789-09', jornada: '44h', contrato: 'CLT' },
  { id: 10, nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', departamento: 'Produção', admissao: '2022-04-20', salario: 4628, status: 'ativo', email: 'gabriel@montex.com.br', telefone: '(31) 99801-1010', cpf: '123.456.789-10', jornada: '44h', contrato: 'CLT' },
  { id: 11, nome: 'Jeferson Bruno de O. Costa', cargo: 'Montador III', departamento: 'Produção', admissao: '2019-08-10', salario: 6833, status: 'ativo', email: 'jeferson@montex.com.br', telefone: '(31) 99801-1011', cpf: '123.456.789-11', jornada: '44h', contrato: 'CLT' },
  { id: 12, nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', departamento: 'Produção', admissao: '2018-11-05', salario: 9776, status: 'ativo', email: 'joao.soares@montex.com.br', telefone: '(31) 99801-1012', cpf: '123.456.789-12', jornada: '44h', contrato: 'CLT' },
  { id: 13, nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', departamento: 'Produção', admissao: '2023-05-15', salario: 2100, status: 'ativo', email: 'joao.batista@montex.com.br', telefone: '(31) 99801-1013', cpf: '123.456.789-13', jornada: '44h', contrato: 'CLT' },
  { id: 14, nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', departamento: 'Produção', admissao: '2022-10-01', salario: 4628, status: 'ativo', email: 'jose.eduardo@montex.com.br', telefone: '(31) 99801-1014', cpf: '123.456.789-14', jornada: '44h', contrato: 'CLT' },
  { id: 15, nome: 'Juscelio Rodrigues de Souza', cargo: 'Soldador I', departamento: 'Produção', admissao: '2020-02-20', salario: 5440, status: 'ativo', email: 'juscelio.souza@montex.com.br', telefone: '(31) 99801-1015', cpf: '123.456.789-15', jornada: '44h', contrato: 'CLT' },
  { id: 16, nome: 'Juscelio Rodrigues', cargo: 'Montador III', departamento: 'Produção', admissao: '2018-04-10', salario: 6245, status: 'ativo', email: 'juscelio@montex.com.br', telefone: '(31) 99801-1016', cpf: '123.456.789-16', jornada: '44h', contrato: 'CLT' },
  { id: 17, nome: 'Luiz Barbosa Ferrera', cargo: 'Soldador I', departamento: 'Produção', admissao: '2019-07-15', salario: 5440, status: 'ativo', email: 'luiz@montex.com.br', telefone: '(31) 99801-1017', cpf: '123.456.789-17', jornada: '44h', contrato: 'CLT' },
  { id: 18, nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', departamento: 'Produção', admissao: '2017-09-01', salario: 7881, status: 'ativo', email: 'ricardo@montex.com.br', telefone: '(31) 99801-1018', cpf: '123.456.789-18', jornada: '44h', contrato: 'CLT' },
  { id: 19, nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', departamento: 'Produção', admissao: '2021-03-10', salario: 3496, status: 'ativo', email: 'tarcisio@montex.com.br', telefone: '(31) 99801-1019', cpf: '123.456.789-19', jornada: '44h', contrato: 'CLT' },
  { id: 20, nome: 'Waldercy Miranda', cargo: 'Montador II', departamento: 'Produção', admissao: '2019-12-05', salario: 6245, status: 'ativo', email: 'waldercy@montex.com.br', telefone: '(31) 99801-1020', cpf: '123.456.789-20', jornada: '44h', contrato: 'CLT' },
  { id: 21, nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', departamento: 'Produção', admissao: '2023-03-20', salario: 3496, status: 'ativo', email: 'wendel@montex.com.br', telefone: '(31) 99801-1021', cpf: '123.456.789-21', jornada: '44h', contrato: 'CLT' },
  { id: 22, nome: 'Whashington de Oliveira', cargo: 'Encarregado de Campo II', departamento: 'Produção', admissao: '2016-11-15', salario: 7096, status: 'ativo', email: 'whashington@montex.com.br', telefone: '(31) 99801-1022', cpf: '123.456.789-22', jornada: '44h', contrato: 'CLT' },
];
const mockRegistrosPonto = [
  { id: 1, funcionario: 'Gilmar Sousa da Silva', data: '2026-02-09', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado' },
  { id: 2, funcionario: 'Jeferson Bruno de O. Costa', data: '2026-02-09', entrada: '07:00', saida: '16:30', intervalo: '1h', horasTrabalhadas: 8.5, horasExtras: 0.5, status: 'registrado' },
  { id: 3, funcionario: 'Ricardo Alves Pereira', data: '2026-02-09', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado' },
  { id: 4, funcionario: 'Diego Alves da Silva', data: '2026-02-09', entrada: '07:15', saida: '16:45', intervalo: '1h', horasTrabalhadas: 8.5, horasExtras: 0.5, status: 'registrado' },
  { id: 5, funcionario: 'Whashington de Oliveira', data: '2026-02-09', entrada: '06:45', saida: '17:15', intervalo: '1h', horasTrabalhadas: 9.5, horasExtras: 1.5, status: 'registrado' },
];
const mockFolhaPagamento = [
  { id: 1, funcionario: 'Cristiane Vieira', salarioBruto: 3322, inss: 249.15, irrf: 0, valeTransporte: 199.32, valeAlimentacao: 350, salarioLiquido: 2523.53 },
  { id: 2, funcionario: 'Diego Alves da Silva', salarioBruto: 4628, inss: 416.52, irrf: 72.97, valeTransporte: 277.68, valeAlimentacao: 350, salarioLiquido: 3510.83 },
  { id: 3, funcionario: 'David Barbosa de Souza', salarioBruto: 4388, inss: 394.92, irrf: 54.96, valeTransporte: 263.28, valeAlimentacao: 350, salarioLiquido: 3324.84 },
  { id: 4, funcionario: 'Eder Bruno Silva Ferreira', salarioBruto: 5217, inss: 469.53, irrf: 117.17, valeTransporte: 313.02, valeAlimentacao: 350, salarioLiquido: 3967.28 },
  { id: 5, funcionario: 'Derlei Gobbi', salarioBruto: 3500, inss: 262.50, irrf: 0, valeTransporte: 210.00, valeAlimentacao: 350, salarioLiquido: 2677.50 },
  { id: 6, funcionario: 'Erick Welison Hosni de Paula', salarioBruto: 2800, inss: 210.00, irrf: 0, valeTransporte: 168.00, valeAlimentacao: 350, salarioLiquido: 2072.00 },
  { id: 7, funcionario: 'Flavio da Cruz', salarioBruto: 6623, inss: 596.07, irrf: 222.66, valeTransporte: 397.38, valeAlimentacao: 350, salarioLiquido: 5056.89 },
  { id: 8, funcionario: 'Flavio de Jesus Santos', salarioBruto: 5559, inss: 500.31, irrf: 142.85, valeTransporte: 333.54, valeAlimentacao: 350, salarioLiquido: 4232.30 },
  { id: 9, funcionario: 'Gilmar Sousa da Silva', salarioBruto: 6411, inss: 576.99, irrf: 206.74, valeTransporte: 384.66, valeAlimentacao: 350, salarioLiquido: 4892.61 },
  { id: 10, funcionario: 'Gabriel Ferreira Santos', salarioBruto: 4628, inss: 416.52, irrf: 72.97, valeTransporte: 277.68, valeAlimentacao: 350, salarioLiquido: 3510.83 },
  { id: 11, funcionario: 'Jeferson Bruno de O. Costa', salarioBruto: 6833, inss: 614.97, irrf: 238.43, valeTransporte: 409.98, valeAlimentacao: 350, salarioLiquido: 5219.62 },
  { id: 12, funcionario: 'João Ermelindo Soares', salarioBruto: 9776, inss: 879.84, irrf: 459.37, valeTransporte: 586.56, valeAlimentacao: 350, salarioLiquido: 7500.23 },
  { id: 13, funcionario: 'João Batista Alves Rodrigues', salarioBruto: 2100, inss: 157.50, irrf: 0, valeTransporte: 126.00, valeAlimentacao: 350, salarioLiquido: 1466.50 },
  { id: 14, funcionario: 'José Eduardo Lucas', salarioBruto: 4628, inss: 416.52, irrf: 72.97, valeTransporte: 277.68, valeAlimentacao: 350, salarioLiquido: 3510.83 },
  { id: 15, funcionario: 'Juscelio Rodrigues de Souza', salarioBruto: 5440, inss: 489.60, irrf: 133.91, valeTransporte: 326.40, valeAlimentacao: 350, salarioLiquido: 4140.09 },
  { id: 16, funcionario: 'Juscelio Rodrigues', salarioBruto: 6245, inss: 562.05, irrf: 194.27, valeTransporte: 374.70, valeAlimentacao: 350, salarioLiquido: 4763.98 },
  { id: 17, funcionario: 'Luiz Barbosa Ferrera', salarioBruto: 5440, inss: 489.60, irrf: 133.91, valeTransporte: 326.40, valeAlimentacao: 350, salarioLiquido: 4140.09 },
  { id: 18, funcionario: 'Ricardo Alves Pereira', salarioBruto: 7881, inss: 709.29, irrf: 317.17, valeTransporte: 472.86, valeAlimentacao: 350, salarioLiquido: 6031.68 },
  { id: 19, funcionario: 'Tarcísio Vieira de Almeida', salarioBruto: 3496, inss: 262.20, irrf: 0, valeTransporte: 209.76, valeAlimentacao: 350, salarioLiquido: 2674.04 },
  { id: 20, funcionario: 'Waldercy Miranda', salarioBruto: 6245, inss: 562.05, irrf: 194.27, valeTransporte: 374.70, valeAlimentacao: 350, salarioLiquido: 4763.98 },
  { id: 21, funcionario: 'Wendel Gabriel Alves dos Reis', salarioBruto: 3496, inss: 262.20, irrf: 0, valeTransporte: 209.76, valeAlimentacao: 350, salarioLiquido: 2674.04 },
  { id: 22, funcionario: 'Whashington de Oliveira', salarioBruto: 7096, inss: 638.64, irrf: 258.22, valeTransporte: 425.76, valeAlimentacao: 350, salarioLiquido: 5423.38 },
];

const mockEventos = [
  { id: 1, tipo: 'ferias', funcionario: 'Derlei Gobbi', inicio: '2026-03-01', fim: '2026-03-20', dias: 20, status: 'agendado' },
  { id: 2, tipo: 'treinamento', funcionario: 'Erick Welison Hosni de Paula', inicio: '2026-02-15', fim: '2026-02-15', dias: 1, status: 'agendado' },
  { id: 3, tipo: 'atestado', funcionario: 'João Batista Alves Rodrigues', inicio: '2026-02-03', fim: '2026-02-05', dias: 3, status: 'concluido' },
  { id: 4, tipo: 'treinamento', funcionario: 'Wendel Gabriel Alves dos Reis', inicio: '2026-02-20', fim: '2026-02-21', dias: 2, status: 'agendado' },
];

const departamentos = ['Produção', 'Administrativo', 'Financeiro', 'Comercial', 'Projetos', 'TI'];

const statusConfig = {
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  ferias: { label: 'Férias', color: 'bg-blue-100 text-blue-800' },
  afastado: { label: 'Afastado', color: 'bg-yellow-100 text-yellow-800' },
  desligado: { label: 'Desligado', color: 'bg-red-100 text-red-800' },
  regular: { label: 'Regular', color: 'bg-green-100 text-green-800' },
  atraso: { label: 'Atraso', color: 'bg-yellow-100 text-yellow-800' },
  falta: { label: 'Falta', color: 'bg-red-100 text-red-800' },
  processada: { label: 'Processada', color: 'bg-green-100 text-green-800' },
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  em_curso: { label: 'Em Curso', color: 'bg-blue-100 text-blue-800' },
  agendado: { label: 'Agendado', color: 'bg-purple-100 text-purple-800' },
};

function KPICard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {trend && (
              <div className={`flex items-center text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.ativo;
  return <Badge className={config.color}>{config.label}</Badge>;
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function NovoFuncionarioDialog({ onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cargo: '',
    departamento: '',
    admissao: '',
    salario: '',
    jornada: '',
    tipoContrato: '',
    endereco: '',
    banco: '',
    conta: ''
  });

  const handleSave = () => {
    if (!formData.nome || !formData.email || !formData.cargo || !formData.departamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const newFuncionario = {
      id: Date.now(),
      nome: formData.nome,
      cargo: formData.cargo,
      departamento: formData.departamento,
      admissao: formData.admissao || new Date().toISOString().split('T')[0],
      salario: parseInt(formData.salario) || 0,
      status: 'ativo',
      foto: null,
      email: formData.email,
      telefone: formData.telefone
    };

    onSave(newFuncionario);
    setFormData({
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      cargo: '',
      departamento: '',
      admissao: '',
      salario: '',
      jornada: '',
      tipoContrato: '',
      endereco: '',
      banco: '',
      conta: ''
    });
    setOpen(false);
    toast.success('Funcionário cadastrado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar Funcionário</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo colaborador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" placeholder="Nome do funcionário" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email_func">E-mail</Label>
              <Input type="email" id="email_func" placeholder="email@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_func">Telefone</Label>
              <Input id="telefone_func" placeholder="(00) 00000-0000" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" placeholder="Cargo" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Select value={formData.departamento} onValueChange={(value) => setFormData({...formData, departamento: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map(dep => (
                    <SelectItem key={dep} value={dep.toLowerCase()}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissao">Data de Admissão</Label>
              <Input type="date" id="admissao" value={formData.admissao} onChange={(e) => setFormData({...formData, admissao: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salario">Salário</Label>
              <Input type="number" id="salario" placeholder="0,00" value={formData.salario} onChange={(e) => setFormData({...formData, salario: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jornada">Jornada</Label>
              <Select value={formData.jornada} onValueChange={(value) => setFormData({...formData, jornada: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="44h">44h semanais</SelectItem>
                  <SelectItem value="40h">40h semanais</SelectItem>
                  <SelectItem value="30h">30h semanais</SelectItem>
                  <SelectItem value="20h">20h semanais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
              <Select value={formData.tipoContrato} onValueChange={(value) => setFormData({...formData, tipoContrato: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="estagio">Estágio</SelectItem>
                  <SelectItem value="temporario">Temporário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" placeholder="Endereço completo" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" placeholder="Nome do banco" value={formData.banco} onChange={(e) => setFormData({...formData, banco: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conta">Agência / Conta</Label>
              <Input id="conta" placeholder="0000 / 00000-0" value={formData.conta} onChange={(e) => setFormData({...formData, conta: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarPontoDialog({ funcionarios, onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    funcionario: '',
    data: '',
    tipo: '',
    hora: '',
    justificativa: ''
  });

  const handleSave = () => {
    if (!formData.funcionario || !formData.data || !formData.tipo || !formData.hora) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const funcionario = funcionarios.find(f => f.id.toString() === formData.funcionario);
    const novoRegistro = {
      id: Date.now(),
      funcionario: funcionario?.nome || formData.funcionario,
      data: formData.data,
      entrada: formData.tipo === 'entrada' ? formData.hora : null,
      intervaloSaida: formData.tipo === 'intervalo_saida' ? formData.hora : null,
      intervaloRetorno: formData.tipo === 'intervalo_retorno' ? formData.hora : null,
      saida: formData.tipo === 'saida' ? formData.hora : null,
      horasExtras: '0:00',
      status: 'regular'
    };

    onSave(novoRegistro);
    setFormData({ funcionario: '', data: '', tipo: '', hora: '', justificativa: '' });
    setOpen(false);
    toast.success('Ponto registrado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Timer className="h-4 w-4" />
          Registrar Ponto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ponto Manual</DialogTitle>
          <DialogDescription>
            Registre o ponto de um funcionário manualmente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="funcionario_ponto">Funcionário</Label>
            <Select value={formData.funcionario} onValueChange={(value) => setFormData({...formData, funcionario: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.filter(f => f.status === 'ativo').map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_ponto">Data</Label>
              <Input type="date" id="data_ponto" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_registro">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="intervalo_saida">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      Saída Intervalo
                    </div>
                  </SelectItem>
                  <SelectItem value="intervalo_retorno">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      Retorno Intervalo
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Saída
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora_ponto">Horário</Label>
            <Input type="time" id="hora_ponto" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa</Label>
            <Textarea id="justificativa" placeholder="Motivo do registro manual..." value={formData.justificativa} onChange={(e) => setFormData({...formData, justificativa: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SolicitarEventoDialog({ funcionarios, onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    funcionario: '',
    tipo: '',
    dataInicio: '',
    dataFim: '',
    observacao: ''
  });

  const handleSave = () => {
    if (!formData.funcionario || !formData.tipo || !formData.dataInicio || !formData.dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const funcionario = funcionarios.find(f => f.id.toString() === formData.funcionario);
    const inicio = new Date(formData.dataInicio);
    const fim = new Date(formData.dataFim);
    const dias = Math.floor((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;

    const novoEvento = {
      id: Date.now(),
      tipo: formData.tipo,
      funcionario: funcionario?.nome || formData.funcionario,
      inicio: formData.dataInicio,
      fim: formData.dataFim,
      dias: dias,
      status: 'agendado'
    };

    onSave(novoEvento);
    setFormData({ funcionario: '', tipo: '', dataInicio: '', dataFim: '', observacao: '' });
    setOpen(false);
    toast.success('Solicitação registrada com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plane className="h-4 w-4" />
          Solicitar Férias/Afastamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
          <DialogDescription>
            Registre férias, afastamentos ou outros eventos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="funcionario_evento">Funcionário</Label>
            <Select value={formData.funcionario} onValueChange={(value) => setFormData({...formData, funcionario: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.filter(f => f.status === 'ativo').map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo_evento">Tipo de Evento</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ferias">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Férias
                  </div>
                </SelectItem>
                <SelectItem value="atestado">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Atestado Médico
                  </div>
                </SelectItem>
                <SelectItem value="licenca">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Licença
                  </div>
                </SelectItem>
                <SelectItem value="treinamento">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Treinamento
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input type="date" id="data_inicio" value={formData.dataInicio} onChange={(e) => setFormData({...formData, dataInicio: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input type="date" id="data_fim" value={formData.dataFim} onChange={(e) => setFormData({...formData, dataFim: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao_evento">Observação</Label>
            <Textarea id="observacao_evento" placeholder="Observações adicionais..." value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RHPage() {
  const [funcionarios, setFuncionarios] = useState(mockFuncionarios);
  const [registrosPonto, setRegistrosPonto] = useState(mockRegistrosPonto);
  const [eventos, setEventos] = useState(mockEventos);
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFilter, setDepartamentoFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('funcionarios');

  const filteredFuncionarios = funcionarios.filter(func => {
    const matchesSearch = func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         func.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartamento = departamentoFilter === 'todos' || func.departamento.toLowerCase() === departamentoFilter;
    return matchesSearch && matchesDepartamento;
  });

  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo').length;
  const totalFolha = mockFolhaPagamento.reduce((acc, f) => acc + f.salarioBruto, 0);
  const horasExtrasTotal = registrosPonto.reduce((acc, r) => {
    const [h, m] = r.horasExtras.split(':').map(Number);
    return acc + h + m/60;
  }, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">
            Gestão de funcionários, ponto eletrônico e folha de pagamento
          </p>
        </div>
        <div className="flex gap-2">
          <SolicitarEventoDialog funcionarios={funcionarios} onSave={(evento) => setEventos([...eventos, evento])} />
          <RegistrarPontoDialog funcionarios={funcionarios} onSave={(registro) => setRegistrosPonto([...registrosPonto, registro])} />
          <NovoFuncionarioDialog onSave={(func) => setFuncionarios([...funcionarios, func])} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Funcionários Ativos"
          value={funcionariosAtivos}
          subtitle={`${funcionarios.length} total cadastrados`}
          icon={Users}
        />
        <KPICard
          title="Folha de Pagamento"
          value={`R$ ${totalFolha.toLocaleString('pt-BR')}`}
          subtitle="Este mês"
          icon={DollarSign}
          trend="+3.2%"
          trendUp={false}
        />
        <KPICard
          title="Horas Extras"
          value={`${horasExtrasTotal.toFixed(1)}h`}
          subtitle="Esta semana"
          icon={Clock}
          trend="+15%"
          trendUp={false}
        />
        <KPICard
          title="Ausências Hoje"
          value={funcionarios.filter(f => f.status !== 'ativo').length}
          subtitle="Férias e afastamentos"
          icon={CalendarIcon}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="funcionarios" className="gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="ponto" className="gap-2">
            <Clock className="h-4 w-4" />
            Ponto
          </TabsTrigger>
          <TabsTrigger value="folha" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Folha
          </TabsTrigger>
          <TabsTrigger value="eventos" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Eventos
          </TabsTrigger>
        </TabsList>

        {/* Funcionários */}
        <TabsContent value="funcionarios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Colaboradores</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar funcionário..."
                      className="pl-8 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {departamentos.map(dep => (
                        <SelectItem key={dep} value={dep.toLowerCase()}>{dep}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFuncionarios.map((func) => (
                  <Card key={func.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={func.foto} />
                          <AvatarFallback>{getInitials(func.nome)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{func.nome}</h4>
                            <StatusBadge status={func.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{func.cargo}</p>
                          <p className="text-xs text-muted-foreground">{func.departamento}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {func.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {func.telefone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          Admissão: {new Date(func.admissao).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.success(`Visualizando ${func.nome}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.success(`Editando ${func.nome}`)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ponto Eletrônico */}
        <TabsContent value="ponto" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Registro de Ponto</CardTitle>
                <div className="flex gap-2">
                  <Input type="date" className="w-[150px]" defaultValue="2024-01-15" />
                  <Select defaultValue="todos">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {mockFuncionarios.map(f => (
                        <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída Int.</TableHead>
                    <TableHead>Retorno Int.</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Horas Extras</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosPonto.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="font-medium">{registro.funcionario}</TableCell>
                      <TableCell>{new Date(registro.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <LogIn className="h-4 w-4 text-green-600" />
                          {registro.entrada}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coffee className="h-4 w-4 text-yellow-600" />
                          {registro.intervaloSaida}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coffee className="h-4 w-4 text-yellow-600" />
                          {registro.intervaloRetorno}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <LogOut className="h-4 w-4 text-red-600" />
                          {registro.saida}
                        </div>
                      </TableCell>
                      <TableCell className={registro.horasExtras !== '0:00' ? 'text-blue-600 font-medium' : ''}>
                        {registro.horasExtras}
                      </TableCell>
                      <TableCell><StatusBadge status={registro.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Folha de Pagamento */}
        <TabsContent value="folha" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Folha de Pagamento - Janeiro/2024</h3>
              <p className="text-sm text-muted-foreground">Processamento mensal de salários</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => toast.success('Folha de pagamento exportada com sucesso!')}>
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button className="gap-2" onClick={() => toast.success('Folha de pagamento processada com sucesso!')}>
                <CheckCircle className="h-4 w-4" />
                Processar Folha
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead className="text-right">Salário Bruto</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Benefícios</TableHead>
                    <TableHead className="text-right">Salário Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFolhaPagamento.map((folha) => (
                    <TableRow key={folha.id}>
                      <TableCell className="font-medium">{folha.funcionario}</TableCell>
                      <TableCell className="text-right">R$ {folha.salarioBruto.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-red-600">- R$ {folha.descontos.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-green-600">+ R$ {folha.beneficios.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-semibold">R$ {folha.liquido.toLocaleString('pt-BR')}</TableCell>
                      <TableCell><StatusBadge status={folha.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Total: {mockFolhaPagamento.length} funcionários
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Bruto</p>
                    <p className="font-semibold">R$ {totalFolha.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Líquido</p>
                    <p className="font-semibold">R$ {mockFolhaPagamento.reduce((acc, f) => acc + f.liquido, 0).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eventos */}
        <TabsContent value="eventos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Férias, Afastamentos e Eventos</CardTitle>
                <Select defaultValue="todos">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="atestado">Atestado</SelectItem>
                    <SelectItem value="licenca">Licença</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {eventos.map((evento) => (
                  <Card key={evento.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            evento.tipo === 'ferias' ? 'bg-blue-100' :
                            evento.tipo === 'atestado' ? 'bg-red-100' :
                            evento.tipo === 'treinamento' ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {evento.tipo === 'ferias' && <Plane className="h-5 w-5 text-blue-600" />}
                            {evento.tipo === 'atestado' && <Heart className="h-5 w-5 text-red-600" />}
                            {evento.tipo === 'treinamento' && <GraduationCap className="h-5 w-5 text-green-600" />}
                            {evento.tipo === 'licenca' && <FileText className="h-5 w-5 text-gray-600" />}
                          </div>
                          <div>
                            <h4 className="font-semibold">{evento.funcionario}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{evento.tipo}</p>
                          </div>
                        </div>
                        <StatusBadge status={evento.status} />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            {new Date(evento.inicio).toLocaleDateString('pt-BR')} - {new Date(evento.fim).toLocaleDateString('pt-BR')}
                          </div>
                          <Badge variant="outline">{evento.dias} dias</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Ver Detalhes</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
