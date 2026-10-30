import React from 'react';
import { Globe } from 'lucide-react';

export const McpAboutCard: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
      <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-slate-300">About Model Context Protocol (MCP)</p>
        <p className="text-slate-400 mt-0.5 leading-relaxed">
          MCP is the universal open standard pioneered by Anthropic and adopted across the AI industry. It allows Seyal AI to safely discover and run tools on your machine without embedding hardcoded APIs into the agent.
        </p>
      </div>
    </div>
  );
};
