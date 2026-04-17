import React from 'react';
import { Link2, Hexagon } from 'lucide-react';

interface WebhookInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const WebhookInput: React.FC<WebhookInputProps> = ({ value, onChange }) => {
  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      <div className="text-[14px] font-bold text-secondary uppercase tracking-[1px] leading-none">Target Configuration</div>
      
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-text-muted">WEBHOOK URL</label>
        <div className="relative group">
          <input
            type="url"
            placeholder="https://hooks.api.svc/v1/..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field w-full pl-10"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">
            <Link2 size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-text-muted">PAYLOAD FORMAT</label>
        <div className="relative group">
          <input
            type="text"
            value="multipart/form-data"
            readOnly
            className="input-field w-full pl-10 opacity-70 cursor-not-allowed"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
            <Hexagon size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
