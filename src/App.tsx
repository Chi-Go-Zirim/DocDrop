/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadZone } from './components/UploadZone.tsx';
import { FileItem, FileStatus } from './components/FileItem.tsx';
import { ChatMode } from './components/ChatMode.tsx';
import { Send, Sparkles, Zap, LayoutDashboard, MessageSquareText, Menu, X, Shield } from 'lucide-react';

interface FileUpload {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
}

export default function App() {
  const [webhookUrl] = useState(import.meta.env.VITE_UPLOAD_WEBHOOK_URL || '');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'chat'>('upload');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const additions: FileUpload[] = newFiles.map(file => ({
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
    if (!webhookUrl || webhookUrl.includes('placeholder')) {
      alert('Upload Webhook URL not configured. Please add VITE_UPLOAD_WEBHOOK_URL to your environment variables in the Settings menu.');
      return;
    }

    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const item of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('fileName', item.file.name);
        formData.append('fileType', item.file.type);
        formData.append('userId', 'chigozirimkalu@gmail.com'); // Derived from user context
        
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === item.id && f.progress < 90) return { ...f, progress: f.progress + 10 };
            return f;
          }));
        }, 100);

        const response = await fetch(webhookUrl, { 
          method: 'POST', 
          body: formData 
        });

        clearInterval(progressInterval);

        if (response.ok) {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`Upload failed with status ${response.status}: ${errorText}`);
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
          alert(`Upload failed (${response.status}). Check terminal/console for details.`);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
        alert('Upload connection failed. This is likely due to CORS or the URL being unreachable.');
      }
    }
    setIsUploading(false);
  };

  const navItems = [
    { id: 'upload' as const, label: 'Upload Terminal', icon: LayoutDashboard },
    { id: 'chat' as const, label: 'AI Assistance', icon: MessageSquareText },
  ];

  return (
    <div className="flex min-h-screen bg-bg-dark text-white selection:bg-primary/30 h-screen overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col glass-panel border-r border-white/5 z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Zap size={18} strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight">DocDrop</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium
                ${mode === item.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 opacity-40">
          <p className="text-[10px] uppercase tracking-widest font-bold text-center">DocDrop v2.1</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-6 border-b border-white/5 bg-bg-dark/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            <span className="text-lg font-bold tracking-tight">DocDrop</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-xl bg-white/5 text-zinc-400">
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center">
          <div className="w-full max-w-4xl h-full flex flex-col gap-8">
            {mode === 'upload' ? (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <header className="text-center space-y-4 pt-4 md:pt-10">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    Instant Document <span className="text-primary italic">Dispatch.</span>
                  </h1>
                  <p className="text-base text-text-muted max-w-lg mx-auto leading-relaxed">
                    Drop files to pipe them directly to your destination. Simple, secure, and built for speed.
                  </p>
                </header>

                <div className="w-full space-y-6">
                  <UploadZone onFilesAdded={handleFilesAdded} />
                  
                  <AnimatePresence mode="popLayout">
                    {files.length > 0 && (
                      <div className="flex flex-col gap-3">
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
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="pt-4 space-y-6">
                    <button
                      onClick={uploadFiles}
                      disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
                      className="btn-primary w-full h-16 text-lg tracking-wide uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                    >
                      {isUploading ? 'In Transit...' : 'Deliver Payload'}
                    </button>
                    <p className="text-center text-xs text-text-muted italic">
                      Target: <span className="text-zinc-400 font-mono underline decoration-primary/30 decoration-dashed">{webhookUrl || 'None'}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col">
                <ChatMode files={files} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-64 bg-bg-dark z-40 p-8 flex flex-col md:hidden border-r border-white/10"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <Zap size={24} className="text-primary" />
                  <span className="text-2xl font-bold tracking-tight">DocDrop</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-zinc-500">
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMode(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all
                      ${mode === item.id 
                        ? 'bg-primary text-white' 
                        : 'text-zinc-500 hover:text-white'
                      }`}
                  >
                    <item.icon size={20} />
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


