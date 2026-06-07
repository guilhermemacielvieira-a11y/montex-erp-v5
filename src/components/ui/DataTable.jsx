// ============================================================
// DataTable — tabela densa reutilizável para o ERP DESKTOP
// ============================================================
// Foco em ergonomia de PC: cabeçalho fixo (sticky), ordenação por coluna,
// rolagem horizontal CONTIDA (não estoura o layout), tema dark consistente,
// densidade configurável e estado vazio. NÃO é usada no app mobile.
//
// Uso:
//   <DataTable
//     columns={[
//       { key: 'marca', header: 'Marca', sortable: true },
//       { key: 'peso', header: 'Peso (kg)', align: 'right', sortable: true,
//         render: (row) => row.peso.toFixed(1) },
//       { key: 'acoes', header: '', align: 'right',
//         render: (row) => <button>…</button>, sortable: false },
//     ]}
//     data={pecas}
//     getRowKey={(r) => r.id}
//     onRowClick={(r) => abrir(r)}
//     maxHeight="60vh"
//     initialSort={{ key: 'peso', dir: 'desc' }}
//   />
// ============================================================
import React, { useMemo, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export default function DataTable({
  columns = [],
  data = [],
  getRowKey,
  onRowClick,
  initialSort = null,            // { key, dir: 'asc' | 'desc' }
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon: EmptyIcon = Inbox,
  stickyHeader = true,
  dense = false,
  maxHeight,                      // ex.: '60vh' — habilita rolagem vertical com header fixo
  className,
  rowClassName,                   // (row, index) => string
  zebra = true,
  footer,                         // ReactNode | (sortedData) => ReactNode — conteúdo do <tfoot> (ex.: linha de TOTAL)
}) {
  const [sort, setSort] = useState(initialSort);

  const toggleSort = useCallback((col) => {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null; // 3º clique limpa a ordenação
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const accessor = col.sortAccessor || ((row) => row[col.key]);
    const arr = [...data];
    arr.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [data, sort, columns]);

  const cellPad = dense ? 'px-3 py-1.5' : 'px-4 py-2.5';

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40',
        maxHeight && 'overflow-y-auto',
        className
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
          <tr className="bg-slate-800/95 backdrop-blur-sm">
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const sortable = col.sortable !== false;
              return (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={cn(
                    'font-semibold text-slate-300 uppercase tracking-wide text-[11px] border-b border-white/10 whitespace-nowrap',
                    cellPad,
                    alignClass[col.align] || 'text-left',
                    sortable && 'cursor-pointer select-none hover:text-white',
                    col.headerClassName
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                    {col.header}
                    {sortable && (
                      isSorted
                        ? (sort.dir === 'asc'
                            ? <ChevronUp className="h-3 w-3 text-cyan-400" />
                            : <ChevronDown className="h-3 w-3 text-cyan-400" />)
                        : <ChevronsUpDown className="h-3 w-3 text-slate-600" />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                <EmptyIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={getRowKey ? getRowKey(row, i) : i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className={cn(
                  'border-b border-white/[0.04] transition-colors',
                  zebra && i % 2 === 1 && 'bg-white/[0.015]',
                  onRowClick && 'cursor-pointer hover:bg-white/[0.05]',
                  rowClassName && rowClassName(row, i)
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'text-slate-200 whitespace-nowrap',
                      cellPad,
                      alignClass[col.align] || 'text-left',
                      col.cellClassName
                    )}
                  >
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot className={cn('bg-slate-800/95 backdrop-blur-sm', stickyHeader && maxHeight && 'sticky bottom-0 z-10')}>
            {typeof footer === 'function' ? footer(sortedData) : footer}
          </tfoot>
        )}
      </table>
    </div>
  );
}
