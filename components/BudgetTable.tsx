
import React from 'react';
import { Table as TableIcon, Download } from 'lucide-react';

interface MaterialItem {
  material: string;
  quantity: number;
  unit: string;
  description?: string;
}

interface Props {
  jsonString: string;
}

export const BudgetTable: React.FC<Props> = ({ jsonString }) => {
  let items: MaterialItem[] = [];
  try {
    const parsed = JSON.parse(jsonString);
    items = parsed.items || [];
  } catch (e) {
    return null;
  }

  if (items.length === 0) return null;

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-slate-200">Relatório de Quantitativos</span>
        </div>
        <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
          <Download className="w-3 h-3" /> Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase font-mono">
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium text-right">Qtd</th>
              <th className="px-4 py-3 font-medium">Unid</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors font-mono">
                <td className="px-4 py-3 text-sm text-slate-200">{item.material}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{item.quantity.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{item.unit}</td>
                <td className="px-4 py-3 text-xs text-slate-500 italic">{item.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
