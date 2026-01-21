
import React from 'react';
import { FileText, FileSpreadsheet, Ruler, Image as ImageIcon, X, File } from 'lucide-react';
import { Attachment } from '../types';

interface Props {
  file: Attachment;
  onRemove?: () => void;
  isCompact?: boolean;
}

export const FilePreview: React.FC<Props> = ({ file, onRemove, isCompact = false }) => {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
  const isDwg = file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf');

  const getIcon = () => {
    if (isImage && isCompact) return <ImageIcon className="w-4 h-4 text-blue-400" />;
    if (isPdf) return <FileText className="w-4 h-4 text-red-500" />;
    if (isExcel) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    if (isDwg) return <Ruler className="w-4 h-4 text-amber-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const getBgColor = () => {
    if (isPdf) return 'bg-[#1a0b0b] border-red-900/30';
    if (isExcel) return 'bg-[#0b1a0e] border-emerald-900/30';
    if (isDwg) return 'bg-[#1a150b] border-amber-900/30';
    return 'bg-[#0f172a] border-slate-700';
  };

  if (isImage && !isCompact) {
    return (
      <div className="relative group flex-shrink-0 animate-in fade-in zoom-in duration-200">
        <img src={file.data} className="w-16 h-16 object-cover rounded-xl border border-slate-700 group-hover:border-blue-500 transition-all shadow-lg" alt={file.name} />
        {onRemove && (
          <button 
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-75"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${getBgColor()} min-w-[140px] max-w-[220px] animate-in slide-in-from-bottom-2 duration-300 shadow-sm relative group`}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-200 truncate leading-tight uppercase tracking-tight">{file.name}</p>
        <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{file.type.split('/')[1] || 'FILE'}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="opacity-40 hover:opacity-100 p-1 text-slate-400 hover:text-white transition-all">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
