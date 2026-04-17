/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadZone } from './components/UploadZone.tsx';
import { FileItem, FileStatus } from './components/FileItem.tsx';
import { Send, Sparkles, Zap } from 'lucide-react';

interface FileUpload {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
}

export default function App() {
  const [webhookUrl] = useState(import.meta.env.VITE_DEFAULT_WEBHOOK_URL || '');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesAdded = useCallback((newFiles: FileList) => {
    const additions: FileUpload[] = Array.from(newFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...additions]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    if (!webhookUrl) {
      alert('Webhook URL not configured. Please check your .env file.');
      return;
    }

    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const item of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === item.id && f.progress < 90) return { ...f, progress: f.progress + 10 };
            return f;
          }));
        }, 100);

        const response = await fetch(webhookUrl, { method: 'POST', body: formData });
        clearInterval(progressInterval);

        if (response.ok) {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white selection:bg-primary/30 flex flex-col items-center">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <nav className="w-full relative z-10 py-8 px-10 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <Zap size={22} strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Doc<span className="text-secondary">Drop</span></span>
        </div>
      </nav>

      <main className="relative z-10 w-full max-w-2xl px-6 py-12 md:py-20 flex flex-col gap-12 items-center text-center">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-white/10 text-primary text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="fill-primary" />
            Simple • Secure • Instant
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1]">
            Drop your documents, <br />
            <span className="text-primary italic">pipe</span> to your code.
          </h1>
          <p className="text-lg text-text-muted max-w-md mx-auto leading-relaxed">
            The minimal terminal for document dispatch. One drop, one click, one successful delivery to your endpoint.
          </p>
        </header>

        <div className="w-full space-y-8">
          <UploadZone onFilesAdded={handleFilesAdded} />
          
          <AnimatePresence mode="popLayout">
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-3"
              >
                {files.map(file => (
                  <FileItem 
                    key={file.id} 
                    name={file.file.name} 
                    size={file.file.size} 
                    status={file.status} 
                    progress={file.progress} 
                    onRemove={() => removeFile(file.id)} 
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 flex flex-col gap-4">
            <button
              onClick={uploadFiles}
              disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
              className="btn-primary w-full h-16 text-lg tracking-wide uppercase group flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {isUploading ? (
                'Synchronizing...'
              ) : (
                <>
                  Deliver Payload
                  <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-xs text-text-muted italic">
              Dispatching to: <span className="text-zinc-400 font-mono underline decoration-primary/30 decoration-dashed">{webhookUrl || 'Not configured'}</span>
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-12 opacity-40">
        <p className="text-[10px] uppercase tracking-widest font-bold">DocDrop v1.0 • Built for Builders</p>
      </footer>
    </div>
  );
}

