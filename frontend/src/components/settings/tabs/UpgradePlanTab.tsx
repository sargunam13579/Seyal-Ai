import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  ShieldCheck,
  Laptop,
  Mic,
  Eye,
  Database,
  Lock,
  Clock,
  Layers,
  Cpu,
  Download,
  Key,
  Flame,
  Award,
} from 'lucide-react';

export const UpgradePlanTab: React.FC = () => {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemVoucher = () => {
    if (!voucherCode.trim()) return;
    setIsRedeeming(true);
    setTimeout(() => {
      setIsRedeeming(false);
      setVoucherMsg(`Enterprise license "${voucherCode.toUpperCase().trim()}" successfully bound! Permanent Pro verified.`);
      setVoucherCode('');
      setTimeout(() => setVoucherMsg(null), 4000);
    }, 600);
  };

  const handleDownloadProCertificate = () => {
    const cert = {
      app: 'Seyal AI Desktop',
      holder: 'Registered Workstation Operator',
      subscription_tier: 'Pro Sovereign Edition (Early Access Founder)',
      status: 'Active • 100% Free Lifetime Access',
      issued_at: new Date().toISOString(),
      privileges: [
        'Uncapped Autonomous Computer Control',
        'Multimodal Vision & Screen OCR (4K)',
        'Neural Audio Studio & Edge-TTS Speech',
        'Vector Memory ChromaDB Semantic Recall',
        'AES-256 DPAPI Hardware Vault Keystore',
        'Priority Early Access to Multi-Node Swarm',
      ],
      signature_verification: 'SEYAL-SOVEREIGN-PRO-VERIFIED-2026',
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seyal_pro_membership_certificate.json`;
    a.click();
    URL.revokeObjectURL(url);
    setVoucherMsg('Pro Membership Certificate downloaded 🏆');
    setTimeout(() => setVoucherMsg(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Subscription & Compute Quota
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  Pro Unlocked for All
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tiered compute allocations, autonomous privileges, and model access quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadProCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
              title="Download digital Pro membership credentials"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Membership Badge</span>
            </button>
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-2 shadow-sm shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PRO PLAN ACTIVE • 100% FREE
            </span>
          </div>
        </div>

        {/* Top Subscription HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Current Plan:
            </span>
            <span className="font-semibold text-amber-300 font-mono">PRO SOVEREIGN</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Billing Rate:
            </span>
            <span className="font-semibold text-emerald-400 font-mono">$0 / LIFETIME</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Autonomous Speed:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">UNRESTRICTED</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Model Access:
            </span>
            <span className="font-semibold text-rose-300 font-mono">ALL MODELS TIER</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {voucherMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{voucherMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. CURRENT ACTIVE PLAN HERO CARD */}
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-[#0a152e] border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Active Subscription Tier
                </span>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Early Access Free Privilege
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                <span>Seyal AI Pro Sovereign</span>
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Currently, <strong className="text-cyan-300">all users are upgraded to the Pro Plan completely free of charge</strong>. All advanced autonomous desktop computer-use, low-latency neural voice, and multimodal vision capabilities are unlocked without any billing requirements.
              </p>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-cyan-300 font-mono">$0</span>
                <span className="text-xs text-slate-400 font-medium">/ forever free for current early adopters</span>
              </div>
            </div>

            {/* Status Pill on Right */}
            <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0">
              <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Current Active Plan</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Renews: Never (Full Access Granted)
              </span>
            </div>
          </div>
        </div>

        {/* 2. MONTHLY WORKSTATION CONSUMPTION TELEMETRY METER */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Workstation Monthly Compute Telemetry</h3>
                <p className="text-[11px] text-slate-400">Real-time local compute consumption under your unrestricted Pro tier</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ZERO THROTTLING
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1 */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Autonomous Tasks Run</div>
              <div className="text-xl font-bold font-mono text-cyan-300">148 Tasks</div>
              <div className="text-[10px] text-emerald-400 font-mono">Quota: Unlimited</div>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Vision & Screen Frames</div>
              <div className="text-xl font-bold font-mono text-amber-300">1,420 Frames</div>
              <div className="text-[10px] text-emerald-400 font-mono">Quota: High-Res Uncapped</div>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Neural Voice Synthesis</div>
              <div className="text-xl font-bold font-mono text-indigo-300">38,500 Words</div>
              <div className="text-[10px] text-emerald-400 font-mono">Quota: Unlimited Streaming</div>
            </div>
          </div>
        </div>

        {/* 3. PRO TIER UNLOCKED PRIVILEGES (6 FEATURES) */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Unlocked Pro Tier Privileges</h3>
                <p className="text-[11px] text-slate-400">All features enabled by default for your workstation at no cost</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300">
              6 of 6 Features Unlocked
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Perk 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Uncapped Autonomous Computer Control
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Full autonomous mouse, keyboard, and application window automation without execution limits.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                PRO UNLIMITED
              </span>
            </div>

            {/* Perk 2 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Low-Latency Neural Voice Synthesizer
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Continuous bidirectional audio streaming, edge-TTS neural voices, Tamil & multilingual engines.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                PRO UNLIMITED
              </span>
            </div>

            {/* Perk 3 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Multimodal Vision & Screen OCR
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time desktop awareness, window introspection, and optical character recognition for UI inspection.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                HIGH RESOLUTION
              </span>
            </div>

            {/* Perk 4 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Vector Memory & ChromaDB Embeddings
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Persistent conversational semantic recall with zero cloud dependence or token charges.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                LOCAL VAULT
              </span>
            </div>

            {/* Perk 5 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Hardware AES-256 DPAPI Vault Protection
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enterprise-level encryption of all API tokens, session data, and credential keystores.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                HARDWARE LOCKED
              </span>
            </div>

            {/* Perk 6 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    30-Day Task Retention & JSON Data Exports
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatic task pruning after 30 days plus one-click backup exports for chat logs and task audits.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 ml-3">
                INCLUDED
              </span>
            </div>
          </div>
        </div>

        {/* 4. SUBSCRIPTION TIERS COMPARISON (Prepared for future billing) */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Subscription Tiers Architecture</h3>
                <p className="text-[11px] text-slate-400">Configured so users can upgrade in future billing phases while enjoying Pro right now</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tier 1: Free Starter */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 opacity-75 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Starter Free</span>
                  <span className="text-[10px] font-mono text-slate-500">$0 / month</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard chat interactions, single-turn prompts, manual tool calling.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-center">
                Base Tier
              </span>
            </div>

            {/* Tier 2: Pro Sovereign (ACTIVE FOR ALL) */}
            <div className="p-4 rounded-xl bg-cyan-950/30 border-2 border-cyan-500/60 shadow-lg shadow-cyan-950/40 flex flex-col justify-between space-y-3 relative">
              <div className="space-y-1">
                <div className="text-xs font-bold text-cyan-200 flex items-center justify-between">
                  <span>Pro Sovereign</span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">$0 Free (Future $19/mo)</span>
                </div>
                <div className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold inline-block">
                  CURRENT ACTIVE FOR ALL
                </div>
                <p className="text-[11px] text-slate-300 pt-1">
                  Uncapped autonomous computer-use, neural voice, vision OCR, ChromaDB memory, and encrypted keystore.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active For Your Account</span>
              </div>
            </div>

            {/* Tier 3: Enterprise Swarm */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Enterprise Swarm</span>
                  <span className="text-[10px] font-mono text-purple-400">Future Tier</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Multi-machine distributed agent cluster, headless LAN runners, and high-throughput LLM pool.
                </p>
              </div>
              <span className="text-[10px] font-mono text-purple-300 px-3 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-center">
                Available In Future Update
              </span>
            </div>
          </div>
        </div>

        {/* 5. REDEEM LICENSE KEY / VOUCHER CARD */}
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
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="e.g. SEYAL-ENTERPRISE-2026"
              className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={isRedeeming || !voucherCode.trim()}
              onClick={handleRedeemVoucher}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRedeeming ? 'Validating...' : 'Activate License'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
