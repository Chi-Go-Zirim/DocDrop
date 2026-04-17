import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadZoneProps {
  onFilesAdded: (files: FileList) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(e.dataTransfer.files);
    }
  }, [onFilesAdded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group cursor-pointer transition-all duration-300 ease-out
        border-2 border-dashed rounded-[24px] p-12 text-center
        ${isDragging 
          ? 'border-primary bg-primary/5 shadow-[0_0_40px_-10px_rgba(59,130,246,0.2)] scale-[0.99]' 
          : 'border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04]'
        }`}
    >
      <input
        id="file-upload"
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className={`transition-all duration-300 ${isDragging ? 'text-primary scale-110 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-zinc-500 group-hover:text-primary'}`}>
            <Upload size={48} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Drop documents here</h3>
            <p className="text-sm text-text-muted">Supports PDF, DOCX, XLSX (Max 50MB)</p>
          </div>
        </div>
      </label>
    </div>
  );
};
