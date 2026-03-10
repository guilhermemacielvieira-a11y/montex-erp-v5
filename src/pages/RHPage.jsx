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

// ==================== DADOS REAIS - FEVEREIRO/2026 ====================
// Extraído dos Comprovantes de Pagamento Salarial MONTEX LTDA + M R MONTAGEM

const funcionarios = [
  // === MONTEX MONTAGEM DE ESTRUTURA METALICA LTDA (CNPJ 10798894000160) ===
  { id: 100, nome: 'Jeferson Bruno de Oliveira Costa', cargo: 'Montador Estrut Metal III', departamento: 'Montagem de Campo', admissao: '2016-01-04', salario: 3591.01, status: 'ativo', email: 'jeferson@montex.com.br', telefone: '', cpf: '118.994.056.66', jornada: '220h', contrato: 'CLT', matricula: '000100', empresa: 'montex' },
  { id: 102, nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', departamento: 'Administrativo Geral', admissao: '2016-07-01', salario: 1900.00, status: 'ativo', email: 'tarcisio@montex.com.br', telefone: '', cpf: '624.472.386.49', jornada: '220h', contrato: 'CLT', matricula: '000102', empresa: 'montex' },
  { id: 109, nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', departamento: 'Solda', admissao: '2018-07-02', salario: 3368.98, status: 'ativo', email: 'gilmar@montex.com.br', telefone: '', cpf: '030.761.066.78', jornada: '220h', contrato: 'CLT', matricula: '000109', empresa: 'montex' },
  { id: 110, nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', departamento: 'Fabricação', admissao: '2018-07-02', salario: 5137.71, status: 'ativo', email: 'joao.soares@montex.com.br', telefone: '', cpf: '041.682.726.80', jornada: '220h', contrato: 'CLT', matricula: '000110', empresa: 'montex' },
  { id: 112, nome: 'Waldercy Miranda', cargo: 'Montador de Estrut Met II', departamento: 'Montagem de Campo', admissao: '2018-08-01', salario: 3281.80, status: 'ativo', email: 'waldercy@montex.com.br', telefone: '', cpf: '046.466.176.50', jornada: '220h', contrato: 'CLT', matricula: '000112', empresa: 'montex' },
  { id: 117, nome: 'Washington de Oliveira', cargo: 'Encarregado de Campo II', departamento: 'Montagem de Campo', admissao: '2018-11-01', salario: 4133.86, status: 'ativo', email: 'washington@montex.com.br', telefone: '', cpf: '055.454.606.08', jornada: '220h', contrato: 'CLT', matricula: '000117', empresa: 'montex' },
  { id: 124, nome: 'Juscélio Rodrigues de Souza', cargo: 'Soldador', departamento: 'Solda', admissao: '2020-07-14', salario: 2859.14, status: 'ativo', email: 'juscelio.souza@montex.com.br', telefone: '', cpf: '104.642.666.45', jornada: '220h', contrato: 'CLT', matricula: '000124', empresa: 'montex' },
  { id: 126, nome: 'Flávio de Jesus Santos', cargo: 'Líder de Produção', departamento: 'Administrativo Produção', admissao: '2020-07-14', salario: 3587.32, status: 'ativo', email: 'flavio.santos@montex.com.br', telefone: '', cpf: '045.668.536.75', jornada: '220h', contrato: 'CLT', matricula: '000126', empresa: 'montex' },
  { id: 136, nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', departamento: 'Administrativo Geral', admissao: '2021-04-09', salario: 1837.63, status: 'ferias', email: 'cristiane@montex.com.br', telefone: '', cpf: '953.165.236.87', jornada: '220h', contrato: 'CLT', matricula: '000136', empresa: 'montex' },
  { id: 140, nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', departamento: 'Fabricação', admissao: '2021-04-15', salario: 4141.86, status: 'ativo', email: 'ricardo@montex.com.br', telefone: '', cpf: '057.565.766.90', jornada: '220h', contrato: 'CLT', matricula: '000140', empresa: 'montex' },
  { id: 148, nome: 'David Barboza de Sousa', cargo: 'Coordenador de Produção', departamento: 'Administrativo Produção', admissao: '2022-04-01', salario: 2700.00, status: 'ativo', email: 'david@montex.com.br', telefone: '', cpf: '104.303.134.03', jornada: '220h', contrato: 'CLT', matricula: '000148', empresa: 'montex' },
  { id: 151, nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', departamento: 'Montagem de Campo', admissao: '2022-06-01', salario: 2741.86, status: 'ativo', email: 'eder@montex.com.br', telefone: '', cpf: '101.648.886.67', jornada: '220h', contrato: 'CLT', matricula: '000151', empresa: 'montex' },
  { id: 152, nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', departamento: 'Montagem de Campo', admissao: '2022-06-01', salario: 2741.86, status: 'ativo', email: 'gabriel@montex.com.br', telefone: '', cpf: '162.854.396.56', jornada: '220h', contrato: 'CLT', matricula: '000152', empresa: 'montex' },
  { id: 153, nome: 'Flávio da Cruz', cargo: 'Instalador Esquadrias Alumínio', departamento: 'Fabricação', admissao: '2022-06-03', salario: 3480.70, status: 'ativo', email: 'flavio.cruz@montex.com.br', telefone: '', cpf: '031.839.346.80', jornada: '220h', contrato: 'CLT', matricula: '000153', empresa: 'montex' },
  { id: 162, nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', departamento: 'Montagem de Campo', admissao: '2022-10-24', salario: 2432.14, status: 'ativo', email: 'jose.eduardo@montex.com.br', telefone: '', cpf: '148.980.306.88', jornada: '220h', contrato: 'CLT', matricula: '000162', empresa: 'montex' },
  { id: 166, nome: 'Juscélio Rodrigues', cargo: 'Montador Estrut Metal III', departamento: 'Montagem de Campo', admissao: '2022-11-23', salario: 3591.01, status: 'ativo', email: 'juscelio@montex.com.br', telefone: '', cpf: '064.560.606.56', jornada: '220h', contrato: 'CLT', matricula: '000166', empresa: 'montex' },
  { id: 169, nome: 'Diego Alves da Silva', cargo: 'Montador I', departamento: 'Montagem de Campo', admissao: '2023-02-13', salario: 2741.86, status: 'ativo', email: 'diego@montex.com.br', telefone: '', cpf: '104.926.756.78', jornada: '220h', contrato: 'CLT', matricula: '000169', empresa: 'montex' },
  { id: 170, nome: 'Luiz Barbosa Ferreira', cargo: 'Soldador', departamento: 'Solda', admissao: '2023-02-13', salario: 2859.14, status: 'ativo', email: 'luiz@montex.com.br', telefone: '', cpf: '753.082.156.34', jornada: '220h', contrato: 'CLT', matricula: '000170', empresa: 'montex' },
  { id: 175, nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', departamento: 'Montagem de Campo', admissao: '2023-04-04', salario: 2432.14, status: 'ferias', email: 'wendel@montex.com.br', telefone: '', cpf: '129.738.176.92', jornada: '220h', contrato: 'CLT', matricula: '000175', empresa: 'montex' },
  { id: 188, nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', departamento: 'Montagem de Campo', admissao: '2025-02-21', salario: 1837.63, status: 'ativo', email: 'joao.batista@montex.com.br', telefone: '', cpf: '442.410.386.20', jornada: '220h', contrato: 'CLT', matricula: '000188', empresa: 'montex' },
  { id: 190, nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', departamento: 'Montagem de Campo', admissao: '2025-03-20', salario: 2432.01, status: 'ativo', email: 'erick@montex.com.br', telefone: '', cpf: '172.028.436.92', jornada: '220h', contrato: 'CLT', matricula: '000190', empresa: 'montex' },
  { id: 191, nome: 'Derlei Gobbi', cargo: 'Montador Estrut Metal III', departamento: 'Montagem de Campo', admissao: '2025-10-14', salario: 3591.01, status: 'ativo', email: 'derlei@montex.com.br', telefone: '', cpf: '525.806.600.20', jornada: '220h', contrato: 'CLT', matricula: '000191', empresa: 'montex' },
  // === M R MONTAGEM ESTRUTURA METALICA LTDA (CNPJ 57580275000169) ===
  { id: 203, nome: 'Daniel Vinícius de Souza Silva', cargo: 'Soldador I', departamento: 'Solda', admissao: '2025-04-03', salario: 2859.14, status: 'ativo', email: 'daniel@montex.com.br', telefone: '', cpf: '134.868.646.45', jornada: '220h', contrato: 'CLT', matricula: '000003', empresa: 'mr' },
  { id: 204, nome: 'Arquiris Junior Rodrigues', cargo: 'Ajudante de Montagem', departamento: 'Montagem de Campo', admissao: '2025-04-03', salario: 1837.63, status: 'ativo', email: 'arquiris@montex.com.br', telefone: '', cpf: '122.656.126.85', jornada: '220h', contrato: 'CLT', matricula: '000004', empresa: 'mr' },
  { id: 207, nome: 'Letícia Fonseca Soares', cargo: 'Técnico em Segurança do Trabalho', departamento: 'Administrativo Produção', admissao: '2025-06-05', salario: 3783.60, status: 'ativo', email: 'leticia@montex.com.br', telefone: '', cpf: '019.202.231.85', jornada: '220h', contrato: 'CLT', matricula: '000007', empresa: 'mr' },
  { id: 208, nome: 'Matheus André Celestino dos Santos', cargo: 'Ajudante de Montagem', departamento: 'Montagem de Campo', admissao: '2025-06-10', salario: 1837.63, status: 'ativo', email: 'matheus@montex.com.br', telefone: '', cpf: '702.629.536.50', jornada: '220h', contrato: 'CLT', matricula: '000008', empresa: 'mr' },
  // === DIÁRIAS MONTEX (PAGAMENTO POR DIÁRIA) ===
  { id: 301, nome: 'Anderson Marçal Silva', salario: 6000, cargo: 'Diarista', departamento: 'Pintura', status: 'ativo', email: '', telefone: '', cpf: '', jornada: '220h', contrato: 'Diária', matricula: '', admissao: '2025-01-01', empresa: 'diaria' },
  { id: 302, nome: 'Flávio Pereira Miranda', salario: 5600, cargo: 'Diarista', departamento: 'Pintura', status: 'ativo', email: '', telefone: '', cpf: '', jornada: '220h', contrato: 'Diária', matricula: '', admissao: '2025-01-01', empresa: 'diaria' },
  { id: 303, nome: 'José Elvécio Mariano', salario: 5000, cargo: 'Diarista', departamento: 'Pintura', status: 'ativo', email: '', telefone: '', cpf: '', jornada: '220h', contrato: 'Diária', matricula: '', admissao: '2025-01-01', empresa: 'diaria' },
];

const mockFuncionarios = funcionarios;

const mockRegistrosPonto = [
  { id: 1, funcionario: 'Jeferson Bruno de Oliveira Costa', data: '2026-02-20', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado', empresa: 'montex' },
  { id: 2, funcionario: 'Gilmar Sousa da Silva', data: '2026-02-20', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado', empresa: 'montex' },
  { id: 3, funcionario: 'Ricardo Alves Pereira', data: '2026-02-20', entrada: '07:00', saida: '17:30', intervalo: '1h', horasTrabalhadas: 9.5, horasExtras: 1.5, status: 'registrado', empresa: 'montex' },
  { id: 4, funcionario: 'Washington de Oliveira', data: '2026-02-20', entrada: '06:45', saida: '17:15', intervalo: '1h', horasTrabalhadas: 9.5, horasExtras: 1.5, status: 'registrado', empresa: 'montex' },
  { id: 5, funcionario: 'Diego Alves da Silva', data: '2026-02-20', entrada: '07:00', saida: '16:30', intervalo: '1h', horasTrabalhadas: 8.5, horasExtras: 0.5, status: 'registrado', empresa: 'montex' },
  { id: 6, funcionario: 'Flávio de Jesus Santos', data: '2026-02-20', entrada: '06:30', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9.5, horasExtras: 1.5, status: 'registrado', empresa: 'montex' },
  { id: 7, funcionario: 'João Ermelindo Soares', data: '2026-02-20', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado', empresa: 'montex' },
  { id: 8, funcionario: 'Derlei Gobbi', data: '2026-02-20', entrada: '07:00', saida: '17:00', intervalo: '1h', horasTrabalhadas: 9, horasExtras: 1, status: 'registrado', empresa: 'montex' },
];

// Folha de pagamento REAL - Fevereiro/2026 (extraído dos contracheques)
const mockFolhaPagamento = [
  { id: 100, funcionario: 'Jeferson Bruno de Oliveira Costa', salarioBruto: 3591.01, inss: 319.51, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4231.01, totalDescontos: 1863.64, salarioLiquido: 2367.37, fgts: 287.28, empresa: 'montex' },
  { id: 102, funcionario: 'Tarcísio Vieira de Almeida', salarioBruto: 1900.00, inss: 146.68, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 2540.00, totalDescontos: 1014.29, salarioLiquido: 1525.71, fgts: 152.00, empresa: 'montex' },
  { id: 109, funcionario: 'Gilmar Sousa da Silva', salarioBruto: 3368.98, inss: 292.86, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4008.98, totalDescontos: 1741.52, salarioLiquido: 2267.46, fgts: 269.51, empresa: 'montex' },
  { id: 110, funcionario: 'João Ermelindo Soares', salarioBruto: 5137.71, inss: 520.78, irrf: 303.81, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 5777.71, totalDescontos: 3117.63, salarioLiquido: 2660.08, fgts: 411.01, empresa: 'montex' },
  { id: 112, funcionario: 'Waldercy Miranda', salarioBruto: 3281.80, inss: 282.40, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3921.80, totalDescontos: 1693.57, salarioLiquido: 2228.23, fgts: 262.54, empresa: 'montex' },
  { id: 117, funcionario: 'Washington de Oliveira', salarioBruto: 4133.86, inss: 384.65, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4773.86, totalDescontos: 2210.86, salarioLiquido: 2563.00, fgts: 330.70, empresa: 'montex' },
  { id: 124, funcionario: 'Juscélio Rodrigues de Souza', salarioBruto: 2859.14, inss: 233.00, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3499.14, totalDescontos: 1462.43, salarioLiquido: 2036.71, fgts: 228.73, empresa: 'montex' },
  { id: 126, funcionario: 'Flávio de Jesus Santos', salarioBruto: 3587.32, inss: 319.06, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4644.23, totalDescontos: 2903.88, salarioLiquido: 1740.35, fgts: 286.98, empresa: 'montex' },
  { id: 136, funcionario: 'Cristiane Vieira', salarioBruto: 1837.63, inss: 115.34, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 2896.85, totalDescontos: 1797.11, salarioLiquido: 646.45, fgts: 156.81, empresa: 'montex' },
  { id: 140, funcionario: 'Ricardo Alves Pereira', salarioBruto: 4141.86, inss: 385.61, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4781.86, totalDescontos: 2223.57, salarioLiquido: 2558.29, fgts: 331.34, empresa: 'montex' },
  { id: 148, funcionario: 'David Barboza de Sousa', salarioBruto: 2700.00, inss: 218.68, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3340.00, totalDescontos: 1379.68, salarioLiquido: 1960.32, fgts: 216.00, empresa: 'montex' },
  { id: 151, funcionario: 'Eder Bruno Silva Ferreira', salarioBruto: 2741.86, inss: 222.44, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3500.65, totalDescontos: 1698.42, salarioLiquido: 1802.23, fgts: 219.34, empresa: 'montex' },
  { id: 152, funcionario: 'Gabriel Ferreira Santos', salarioBruto: 2741.86, inss: 222.44, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3610.21, totalDescontos: 2032.67, salarioLiquido: 1577.54, fgts: 219.34, empresa: 'montex' },
  { id: 153, funcionario: 'Flávio da Cruz', salarioBruto: 3480.70, inss: 306.27, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4120.70, totalDescontos: 1908.77, salarioLiquido: 2211.93, fgts: 278.45, empresa: 'montex' },
  { id: 162, funcionario: 'José Eduardo Lucas', salarioBruto: 2432.14, inss: 194.57, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3072.14, totalDescontos: 1240.39, salarioLiquido: 1831.75, fgts: 194.57, empresa: 'montex' },
  { id: 166, funcionario: 'Juscélio Rodrigues', salarioBruto: 3591.01, inss: 319.51, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4371.97, totalDescontos: 3208.24, salarioLiquido: 1163.73, fgts: 287.28, empresa: 'montex' },
  { id: 169, funcionario: 'Diego Alves da Silva', salarioBruto: 2741.86, inss: 222.44, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3381.86, totalDescontos: 1401.44, salarioLiquido: 1980.42, fgts: 219.34, empresa: 'montex' },
  { id: 170, funcionario: 'Luiz Barbosa Ferreira', salarioBruto: 2859.14, inss: 233.00, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 3499.14, totalDescontos: 1462.43, salarioLiquido: 2036.71, fgts: 228.73, empresa: 'montex' },
  { id: 175, funcionario: 'Wendel Gabriel Alves dos Reis', salarioBruto: 2432.14, inss: 68.57, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4141.72, totalDescontos: 3224.56, salarioLiquido: 917.16, fgts: 259.42, empresa: 'montex' },
  { id: 188, funcionario: 'João Batista Alves Rodrigues', salarioBruto: 1837.63, inss: 141.06, irrf: 0, valeTransporte: 0, valeAlimentacao: 426.67, totalProventos: 2264.30, totalDescontos: 931.24, salarioLiquido: 1333.06, fgts: 147.01, empresa: 'montex' },
  { id: 190, funcionario: 'Erick Welison Hosni de Paula', salarioBruto: 2432.01, inss: 194.56, irrf: 0, valeTransporte: 0, valeAlimentacao: 373.33, totalProventos: 2931.78, totalDescontos: 1556.43, salarioLiquido: 1375.35, fgts: 194.56, empresa: 'montex' },
  { id: 191, funcionario: 'Derlei Gobbi', salarioBruto: 3591.01, inss: 319.51, irrf: 0, valeTransporte: 0, valeAlimentacao: 0, totalProventos: 3591.01, totalDescontos: 1863.64, salarioLiquido: 1727.37, fgts: 287.28, empresa: 'montex' },
  // M R MONTAGEM
  { id: 203, funcionario: 'Daniel Vinícius de Souza Silva', salarioBruto: 2859.14, inss: 233.00, irrf: 0, valeTransporte: 0, valeAlimentacao: 320.00, totalProventos: 3179.14, totalDescontos: 1462.43, salarioLiquido: 1716.71, fgts: 228.73, empresa: 'mr' },
  { id: 204, funcionario: 'Arquiris Junior Rodrigues', salarioBruto: 1837.63, inss: 141.06, irrf: 0, valeTransporte: 0, valeAlimentacao: 320.00, totalProventos: 2157.63, totalDescontos: 931.24, salarioLiquido: 1226.39, fgts: 147.01, empresa: 'mr' },
  { id: 207, funcionario: 'Letícia Fonseca Soares', salarioBruto: 3783.60, inss: 342.62, irrf: 0, valeTransporte: 0, valeAlimentacao: 640.00, totalProventos: 4423.60, totalDescontos: 2009.32, salarioLiquido: 2414.28, fgts: 302.68, empresa: 'mr' },
  { id: 208, funcionario: 'Matheus André Celestino dos Santos', salarioBruto: 1837.63, inss: 141.06, irrf: 0, valeTransporte: 0, valeAlimentacao: 213.33, totalProventos: 2118.50, totalDescontos: 931.24, salarioLiquido: 1187.26, fgts: 147.01, empresa: 'mr' },
  // DIÁRIAS MONTEX
  { id: 301, funcionario: 'Anderson Marçal Silva', salarioBruto: 6000, inss: 0, irrf: 0, valeTransporte: 0, valeAlimentacao: 0, totalProventos: 6000, totalDescontos: 3000, salarioLiquido: 3000, fgts: 0, empresa: 'diaria' },
  { id: 302, funcionario: 'Flávio Pereira Miranda', salarioBruto: 5600, inss: 0, irrf: 0, valeTransporte: 0, valeAlimentacao: 0, totalProventos: 5600, totalDescontos: 2800, salarioLiquido: 2800, fgts: 0, empresa: 'diaria' },
  { id: 303, funcionario: 'José Elvécio Mariano', salarioBruto: 5000, inss: 0, irrf: 0, valeTransporte: 0, valeAlimentacao: 0, totalProventos: 5000, totalDescontos: 2500, salarioLiquido: 2500, fgts: 0, empresa: 'diaria' },
];

const mockEventos = [
  { id: 1, tipo: 'ferias', funcionario: 'Cristiane Vieira', inicio: '2026-02-09', fim: '2026-02-28', dias: 20, status: 'em_curso', empresa: 'montex' },
  { id: 2, tipo: 'ferias', funcionario: 'Wendel Gabriel Alves dos Reis', inicio: '2026-02-02', fim: '2026-02-25', dias: 24, status: 'em_curso', empresa: 'montex' },
  { id: 3, tipo: 'atestado', funcionario: 'Juscélio Rodrigues de Souza', inicio: '2026-01-29', fim: '2026-02-01', dias: 4, status: 'concluido', empresa: 'montex' },
  { id: 4, tipo: 'atestado', funcionario: 'Flávio da Cruz', inicio: '2026-02-18', fim: '2026-02-19', dias: 2, status: 'concluido', empresa: 'montex' },
  { id: 5, tipo: 'atestado', funcionario: 'José Eduardo Lucas', inicio: '2026-02-10', fim: '2026-02-11', dias: 2, status: 'concluido', empresa: 'montex' },
  { id: 6, tipo: 'atestado', funcionario: 'Juscélio Rodrigues', inicio: '2026-02-18', fim: '2026-02-19', dias: 2, status: 'concluido', empresa: 'montex' },
  { id: 7, tipo: 'atestado', funcionario: 'Luiz Barbosa Ferreira', inicio: '2026-02-17', fim: '2026-02-20', dias: 4, status: 'concluido', empresa: 'montex' },
  { id: 8, tipo: 'atestado', funcionario: 'Matheus André Celestino dos Santos', inicio: '2026-02-17', fim: '2026-02-17', dias: 1, status: 'concluido', empresa: 'mr' },
];

const departamentos = ['Pintura', 'Solda', 'Montagem de Campo', 'Fabricação', 'Administrativo Produção', 'Administrativo Geral'];

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
  registrado: { label: 'Registrado', color: 'bg-green-100 text-green-800' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
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
  const [empresaSelecionada, setEmpresaSelecionada] = useState('geral');

  // Filter data by empresa ('geral' = all)
  const funcionariosEmpresa = empresaSelecionada === 'geral' ? funcionarios : funcionarios.filter(f => f.empresa === empresaSelecionada);
  const folhaEmpresa = empresaSelecionada === 'geral' ? mockFolhaPagamento : mockFolhaPagamento.filter(f => f.empresa === empresaSelecionada);
  const pontoEmpresa = empresaSelecionada === 'geral' ? registrosPonto : registrosPonto.filter(r => r.empresa === empresaSelecionada);
  const eventosEmpresa = empresaSelecionada === 'geral' ? eventos : eventos.filter(e => e.empresa === empresaSelecionada);

  const filteredFuncionarios = funcionariosEmpresa.filter(func => {
    const matchesSearch = func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         func.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartamento = departamentoFilter === 'todos' || func.departamento.toLowerCase() === departamentoFilter;
    return matchesSearch && matchesDepartamento;
  });

  const funcionariosAtivos = funcionariosEmpresa.filter(f => f.status === 'ativo').length;
  const totalFolha = folhaEmpresa.reduce((acc, f) => acc + f.salarioBruto, 0);
  const horasExtrasTotal = pontoEmpresa.reduce((acc, r) => {
    if (!r.horasExtras) return acc;
    if (typeof r.horasExtras === 'number') return acc + r.horasExtras;
    if (typeof r.horasExtras === 'string' && r.horasExtras.includes(':')) {
      const [h, m] = r.horasExtras.split(':').map(Number);
      return acc + h + (m || 0) / 60;
    }
    return acc + (parseFloat(r.horasExtras) || 0);
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

      {/* Empresa Selector */}
      <div className="space-y-2">
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          <button onClick={() => setEmpresaSelecionada('geral')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${empresaSelecionada === 'geral' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            GERAL
          </button>
          <button onClick={() => setEmpresaSelecionada('montex')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${empresaSelecionada === 'montex' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            MONTEX
          </button>
          <button onClick={() => setEmpresaSelecionada('mr')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${empresaSelecionada === 'mr' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            MR
          </button>
          <button onClick={() => setEmpresaSelecionada('diaria')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${empresaSelecionada === 'diaria' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            MONTEX DIÁRIA
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          {empresaSelecionada === 'geral' && `Todas as empresas — ${funcionariosEmpresa.length} colaboradores`}
          {empresaSelecionada === 'montex' && `CNPJ: 10.798.894/0001-60 — ${funcionariosEmpresa.length} colaboradores CLT`}
          {empresaSelecionada === 'mr' && `CNPJ: 57.580.275/0001-69 — ${funcionariosEmpresa.length} colaboradores CLT`}
          {empresaSelecionada === 'diaria' && `Pagamento por diária — ${funcionariosEmpresa.length} colaboradores`}
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
          value={funcionariosEmpresa.filter(f => f.status !== 'ativo').length}
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
                      {funcionariosEmpresa.map(f => (
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
                  {pontoEmpresa.map((registro) => (
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
                          {registro.intervaloSaida || '11:30'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coffee className="h-4 w-4 text-yellow-600" />
                          {registro.intervaloRetorno || '12:30'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <LogOut className="h-4 w-4 text-red-600" />
                          {registro.saida}
                        </div>
                      </TableCell>
                      <TableCell className={registro.horasExtras > 0 ? 'text-blue-600 font-medium' : ''}>
                        {typeof registro.horasExtras === 'number' ? `${registro.horasExtras}h` : registro.horasExtras}
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
              <h3 className="text-lg font-semibold">Folha de Pagamento - Fevereiro/2026 - {empresaSelecionada === 'geral' ? 'TODAS AS EMPRESAS' : empresaSelecionada === 'montex' ? 'MONTEX MONTAGEM' : empresaSelecionada === 'mr' ? 'M R MONTAGEM' : 'MONTEX DIÁRIA'}</h3>
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
                  {folhaEmpresa.map((folha) => (
                    <TableRow key={folha.id}>
                      <TableCell className="font-medium">{folha.funcionario}</TableCell>
                      <TableCell className="text-right">R$ {(folha.salarioBruto || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-red-600">- R$ {((folha.inss || 0) + (folha.irrf || 0) + (folha.valeTransporte || 0)).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-green-600">+ R$ {(folha.valeAlimentacao || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-semibold">R$ {(folha.salarioLiquido || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell><StatusBadge status={folha.status || 'processada'} /></TableCell>
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
                    <p className="font-semibold">R$ {mockFolhaPagamento.reduce((acc, f) => acc + (f.salarioLiquido || 0), 0).toLocaleString('pt-BR')}</p>
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
                {eventosEmpresa.map((evento) => (
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
