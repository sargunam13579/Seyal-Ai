import React, { useState } from 'react';
import {
  UpgradePlanHeaderHUD,
  ActivePlanHeroCard,
  ComputeTelemetryCard,
  UnlockedPrivilegesCard,
  SubscriptionTiersCard,
  RedeemVoucherCard,
} from './upgrade_plan';

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
      <UpgradePlanHeaderHUD
        voucherMsg={voucherMsg}
        onDownloadCertificate={handleDownloadProCertificate}
      />

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        <ActivePlanHeroCard />
        <ComputeTelemetryCard />
        <UnlockedPrivilegesCard />
        <SubscriptionTiersCard />
        <RedeemVoucherCard
          voucherCode={voucherCode}
          isRedeeming={isRedeeming}
          onVoucherCodeChange={setVoucherCode}
          onRedeem={handleRedeemVoucher}
        />
      </div>
    </div>
  );
};
