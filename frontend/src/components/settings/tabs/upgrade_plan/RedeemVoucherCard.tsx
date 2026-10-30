import React from 'react';
import { Key } from 'lucide-react';

interface RedeemVoucherCardProps {
  voucherCode: string;
  isRedeeming: boolean;
  onVoucherCodeChange: (code: string) => void;
  onRedeem: () => void;
}

export const RedeemVoucherCard: React.FC<RedeemVoucherCardProps> = ({
  voucherCode,
  isRedeeming,
  onVoucherCodeChange,
  onRedeem,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Key className="w-4 h-4 text-cyan-400" />
          Redeem Enterprise License or Promo Voucher
        </span>
        <span className="text-[10px] text-slate-500">Ready for future paid subscriptions</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={voucherCode}
          onChange={(e) => onVoucherCodeChange(e.target.value)}
          placeholder="e.g. SEYAL-ENTERPRISE-2026"
          className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={isRedeeming || !voucherCode.trim()}
          onClick={onRedeem}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          {isRedeeming ? 'Validating...' : 'Activate License'}
        </button>
      </div>
    </div>
  );
};
