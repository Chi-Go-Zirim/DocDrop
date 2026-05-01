import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, FileText, AlertCircle, MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatModeProps {
  files: { id: string; file: File; status: string }[];
  webhookUrl?: string;
  user?: any;
}

export const ChatMode: React.FC<ChatModeProps> = ({ files, webhookUrl, user }) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Automatically select the last uploaded file if none is selected or if new files arrive
  useEffect(() => {
    if (!selectedFileId && files.length > 0) {
      const uploadedFiles = files.filter(f => f.status === 'delivered' || f.status === 'processed');
      if (uploadedFiles.length > 0) {
        setSelectedFileId(uploadedFiles[uploadedFiles.length - 1].id);
      } else {
        setSelectedFileId(files[0].id);
      }
    }
  }, [files, selectedFileId]);

  const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(7)}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const currentSelectedFileId = selectedFileId;
    const selectedFile = files.find(f => f.id === currentSelectedFileId);

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const chatWebhook = webhookUrl || import.meta.env.VITE_CHAT_WEBHOOK_URL;
      let botResponse = "";

      if (!chatWebhook || chatWebhook.includes('placeholder')) {
        throw new Error("Chat webhook URL is not configured. please set VITE_CHAT_WEBHOOK_URL in your environment variables.");
      }

      // Send to custom webhook with enhanced context
      const payload = {
        message: userMessage,
        chatInput: userMessage,
        chat_input: userMessage,
        input: userMessage,
        text: userMessage,
        query: userMessage,
        question: userMessage,
        sessionId,
        userId: user?.id || user?.email || 'anonymous',
        userEmail: user?.email || '',
        context: {
          type: 'document_chat',
          fileId: selectedFile?.id,
          fileName: selectedFile?.file.name,
          fileType: selectedFile?.file.type,
          fileSize: selectedFile?.file.size,
        },
        documentContext: selectedFile ? {
          id: selectedFile.id,
          name: selectedFile.file.name,
          type: selectedFile.file.type,
          size: selectedFile.file.size
        } : null,
        file: selectedFile ? {
          name: selectedFile.file.name,
          type: selectedFile.file.type,
          size: selectedFile.file.size
        } : null,
        fileName: selectedFile?.file.name || 'None',
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'DocDrop v2.5',
          browser: navigator.userAgent,
          selectedFile: selectedFile?.file.name
        }
      };

      const response = await fetch(chatWebhook, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let data: any;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
          if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
            try { data = JSON.parse(data); } catch (e) { /* ignore */ }
          }
        }
        
        console.log("Webhook Response Received:", data);
        
        const isStatusMessage = (text: string) => {
          const statusPatterns = [
            'delivered to terminal',
            'workflow started',
            'request received',
            'queued',
            'processing started',
            'successfully'
          ];
          const lowerText = text.toLowerCase();
          return statusPatterns.some(p => lowerText.includes(p)) && text.length < 100;
        };

        // Simplified but powerful extraction targeting n8n 'output'
        const extractContent = (obj: any): string | null => {
          if (!obj) return null;
          if (typeof obj === 'string') return isStatusMessage(obj) ? null : obj.trim();
          if (typeof obj !== 'object') return null;

          // 1. Direct 'output' key check (Priority for n8n)
          if (obj.output && typeof obj.output === 'string' && !isStatusMessage(obj.output)) {
            return obj.output.trim();
          }

          // 2. High priority keys
          const keys = ['response', 'text', 'content', 'message', 'result', 'answer', 'reply'];
          for (const key of keys) {
            const val = obj[key];
            if (val && typeof val === 'string' && !isStatusMessage(val)) return val.trim();
            if (val && typeof val === 'object') {
              const res = extractContent(val);
              if (res) return res;
            }
          }

          // 3. Fallback: Any non-status string
          for (const key in obj) {
            const val = obj[key];
            if (typeof val === 'string' && val.trim().length > 0 && !isStatusMessage(val)) return val.trim();
            if (typeof val === 'object' && val !== null && key !== 'file' && key !== 'context') {
              const res = extractContent(val);
              if (res) return res;
            }
          }
          return null;
        };

        // If data is an array (common in n8n list nodes), check first item
        const root = Array.isArray(data) ? data[0] : data;
        botResponse = extractContent(root) || "";

        if (!botResponse || isStatusMessage(botResponse)) {
          if (botResponse && isStatusMessage(botResponse)) {
            botResponse = "Status Update Received: **\"" + botResponse + "\"**\n\n**Warning:** No actual AI agent output was found in the webhook response. Ensure your n8n workflow ends with a 'Respond to Webhook' node returning an 'output' field with the real agent response.";
          } else {
            // Last ditch effort: stringify the whole thing if it's small, otherwise error
            if (typeof data === 'object' && Object.keys(data).length > 0) {
              botResponse = "Webhook returned data but no clear message was found. Data received: \n```json\n" + JSON.stringify(data, null, 2).substring(0, 500) + "\n```";
            } else {
              botResponse = "The webhook returned success but the response body was empty or unparseable.";
            }
          }
        }
      } else {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      setMessages(prev => [...prev, { role: 'bot', content: botResponse || "I'm sorry, I couldn't generate a response." }]);
    } catch (err: any) {
      console.error("Webhook Error:", err);
      setError(`Connection Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <div className="w-full flex-1 flex flex-col h-full glass-card border-white/5 bg-white/[0.01]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <MessageSquareText size={16} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white leading-none">Chat with Document</h3>
            {selectedFile ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Analyzing: {selectedFile.file.name}</p>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Select a document to begin</p>
            )}
          </div>
        </div>
        {files.length > 0 && (
          <select
            value={selectedFileId || ''}
            onChange={(e) => setSelectedFileId(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="">No context</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.file.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <Bot size={48} strokeWidth={1} className="mb-4 text-secondary" />
            <p className="text-sm text-zinc-400">System online. How can I assist you today?</p>
            {files.length > 0 && !selectedFile && <p className="text-[10px] mt-2 uppercase tracking-wide">Tip: Select a file above for contextual chat</p>}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-black'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary/20 border border-primary/20 text-white' : 'bg-zinc-900/40 border border-white/5 text-zinc-200'}`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary text-black flex items-center justify-center animate-pulse">
              <Bot size={14} />
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-secondary" size={14} />
              <span className="text-xs text-zinc-500">Processing...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center mx-auto">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <form 
          onSubmit={handleSendMessage} 
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder={selectedFile ? `Ask about ${selectedFile.file.name}...` : "Type your message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full h-12 bg-white/5 border border-white/10 focus:border-primary/40 rounded-xl px-4 pr-12 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary text-white disabled:bg-zinc-800 disabled:text-zinc-600 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
