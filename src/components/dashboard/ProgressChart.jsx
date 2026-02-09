import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ projetos, relatorios }) {
  const projetosAtivos = projetos.filter(p => 
    ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
  );

  const data = projetosAtivos.slice(0, 6).map(projeto => {
    const ultimoRelatorio = relatorios
      .filter(r => r.projeto_id === projeto.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    return {
      nome: projeto.nome.length > 15 ? projeto.nome.substring(0, 15) + '...' : projeto.nome,
      fabricacao: ultimoRelatorio?.percentual_fabricacao || 0,
      montagem: ultimoRelatorio?.percentual_montagem || 0
    };
  });

  return (
    <Card className="border-slate-100">
      <CardHeader>
        <CardTitle className="text-lg">Progresso de Projetos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="nome" 
              tick={{ fontSize: 11 }} 
              stroke="#64748b"
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              stroke="#64748b"
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="fabricacao" fill="#f97316" name="Fabricação (%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="montagem" fill="#8b5cf6" name="Montagem (%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}