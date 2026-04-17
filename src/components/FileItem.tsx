import React from 'react';
import { File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileItemProps {
  name: string;
  size: number;
  status: FileStatus;
  progress: number;
  onRemove: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({ name, size, status, progress, onRemove }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-card px-5 py-4 flex items-center gap-4 group hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-primary">
        <File size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white truncate">{name}</p>
        </div>
        <p className="text-[12px] text-text-muted mt-0.5">{formatSize(size)} • {status === 'success' ? 'Ready' : 'Pending'}</p>
        
        {status === 'uploading' && (
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {status === 'pending' && <span className="badge badge-yellow">AWAITING ACK</span>}
        {status === 'uploading' && <span className="badge border-primary/20 text-primary bg-primary/10 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> DISPATCHING</span>}
        {status === 'success' && <span className="badge badge-green">DELIVERED 200</span>}
        {status === 'error' && <span className="badge border-red-500/20 text-red-400 bg-red-500/10 uppercase font-bold tracking-widest text-[9px]">FAILED</span>}
        
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-600 hover:text-white transition-all"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};
