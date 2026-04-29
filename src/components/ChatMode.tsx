import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, FileText, AlertCircle, MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatModeProps {
  files: { id: string; file: File; status: string }[];
}

export const ChatMode: React.FC<ChatModeProps> = ({ files }) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files.length > 0 ? files[0].id : null);
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
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    const selectedFile = files.find(f => f.id === selectedFileId);

    try {
      const chatWebhook = import.meta.env.VITE_CHAT_WEBHOOK_URL;
      let botResponse = "";

      if (chatWebhook && !chatWebhook.includes('placeholder')) {
        // Send to custom webhook
        const payload = {
          message: userMessage,
          userId: 'chigozirimkalu_user_id',
          file: selectedFile ? {
            name: selectedFile.file.name,
            type: selectedFile.file.type,
            size: selectedFile.file.size
          } : null,
          timestamp: new Date().toISOString(),
        };

        const response = await fetch(chatWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          botResponse = data.response || data.text || data.message || (typeof data === 'string' ? data : "Message delivered to terminal.");
        } else {
          throw new Error(`Webhook responded with status ${response.status}. Ensure your service handles POST requests.`);
        }
      } else {
        // Fallback to Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Neither a chat webhook nor a Gemini API key is configured. Please check your settings.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        let contents: any[] = [];

        if (selectedFile) {
          const reader = new FileReader();
          const fileDataPromise = new Promise<string>((resolve) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(selectedFile.file);
          });

          const base64Data = await fileDataPromise;
          contents = [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: selectedFile.file.type,
                    data: base64Data,
                  },
                },
                { text: userMessage },
              ],
            },
          ];
        } else {
          contents = [{ parts: [{ text: userMessage }] }];
        }

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction: selectedFile 
              ? "You are a helpful assistant that answers questions about documents. Use the provided document to answer the user's question accurately."
              : "You are a helpful, minimalist technical assistant. Provide clear, concise answers.",
          }
        });

        botResponse = result.text || "";
      }

      setMessages(prev => [...prev, { role: 'bot', content: botResponse || "I'm sorry, I couldn't generate a response." }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      let errorMessage = "Failed to get response from AI.";
      if (err.message.includes('fetch') || err.message.includes('status')) {
        errorMessage = `Webhook error: ${err.message}. If using localhost, ensure your server allows CORS and check for Mixed Content (HTTPS vs HTTP) blocks.`;
      }
      setError(errorMessage);
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
          <div>
            <h3 className="text-sm font-bold text-white leading-none">AI Terminal Assistant</h3>
            {selectedFile && (
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Context: {selectedFile.file.name}</p>
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
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary/20 border border-primary/20 text-white' : 'bg-white/5 border border-white/10 text-zinc-200'}`}>
                  {msg.content}
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
            placeholder="Type your message..."
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
