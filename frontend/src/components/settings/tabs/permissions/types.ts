import type React from 'react';
import {
  Mic,
  Camera,
  Eye,
  MousePointer,
  Keyboard,
  PlaySquare,
  Cpu,
  FolderOpen,
  HardDrive,
  Bell,
  Smartphone,
  MapPin,
  Terminal,
  Globe,
  Clipboard,
  Zap,
} from 'lucide-react';

export interface PermissionItemConfig {
  scope: string;
  name: string;
  description: string;
  category: 'media' | 'os' | 'exec' | 'system';
  riskLevel: 'low' | 'medium' | 'high';
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    border: string;
    text: string;
  };
}

export const PERMISSION_CONFIGS: PermissionItemConfig[] = [
  // 1. Media, Vision & Sensors
  {
    scope: 'microphone',
    name: 'Microphone & Audio Input',
    description: 'Access microphone for real-time hands-free voice conversations, wake-word listening, and audio transcription.',
    category: 'media',
    riskLevel: 'medium',
    icon: Mic,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  },
  {
    scope: 'camera',
    name: 'Camera & Webcam',
    description: 'Access connected webcams for visual processing, document photo capture, and visual question answering.',
    category: 'media',
    riskLevel: 'medium',
    icon: Camera,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  },
  {
    scope: 'screen_capture',
    name: 'Screen Capture & Multimodal Vision',
    description: 'Capture active desktop displays for Set-of-Marks visual UI grounding, screen OCR, and contextual assistance.',
    category: 'media',
    riskLevel: 'medium',
    icon: Eye,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  },

  // 2. Autonomous OS & Input Automation
  {
    scope: 'mouse_control',
    name: 'Autonomous Mouse Control',
    description: 'Direct mouse automation: Move cursor, left/right click, double click, scroll wheel, and drag-and-drop elements.',
    category: 'os',
    riskLevel: 'high',
    icon: MousePointer,
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  },
  {
    scope: 'keyboard_control',
    name: 'Autonomous Keyboard Control',
    description: 'Direct keyboard automation: Type text strings, send system shortcuts (Ctrl+C, Alt+Tab, Enter), and input hotkeys.',
    category: 'os',
    riskLevel: 'high',
    icon: Keyboard,
    color: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  },
  {
    scope: 'clipboard_access',
    name: 'System Clipboard Read & Write',
    description: 'Read copied text and paste content to/from the Windows operating system clipboard.',
    category: 'os',
    riskLevel: 'medium',
    icon: Clipboard,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  },
  {
    scope: 'app_control',
    name: 'Application Lifecycle Management',
    description: 'Launch installed desktop applications, bring windows to foreground, switch windows, and gracefully close apps.',
    category: 'os',
    riskLevel: 'medium',
    icon: PlaySquare,
    color: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  },
  {
    scope: 'accessibility',
    name: 'Accessibility & UI Automation Tree',
    description: 'Inspect UI tree elements, query accessibility states, and perform programmatic hands-free element focus.',
    category: 'os',
    riskLevel: 'low',
    icon: Cpu,
    color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  },

  // 3. Execution, Browser & Code Tools
  {
    scope: 'terminal_execution',
    name: 'PowerShell & Terminal Shell Execution',
    description: 'Execute PowerShell, Command Prompt, and bash commands directly on the host machine for developers.',
    category: 'exec',
    riskLevel: 'high',
    icon: Terminal,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  },
  {
    scope: 'browser_automation',
    name: 'Playwright Browser Automation',
    description: 'Launch browser instances, navigate websites, fill web forms, and extract live web research data.',
    category: 'exec',
    riskLevel: 'medium',
    icon: Globe,
    color: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' },
  },
  {
    scope: 'background_tasks',
    name: 'Background Daemon Autonomous Workflows',
    description: 'Execute scheduled workflows and continuous autonomous agent steps even when Seyal AI is minimized.',
    category: 'exec',
    riskLevel: 'medium',
    icon: Zap,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  },

  // 4. Storage, Notifications & Connected Devices
  {
    scope: 'file_access',
    name: 'File System Read & Write Access',
    description: 'Read local file contents, create new documents, write code changes, and manage directories.',
    category: 'system',
    riskLevel: 'high',
    icon: FolderOpen,
    color: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
  },
  {
    scope: 'file_operations',
    name: 'Directory Discovery & Search',
    description: 'Search files across Downloads, Desktop, Documents, and inspect folder hierarchies and drive structures.',
    category: 'system',
    riskLevel: 'medium',
    icon: HardDrive,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  },
  {
    scope: 'notifications',
    name: 'Desktop Notifications & System Alerts',
    description: 'Display interactive desktop notifications, task completion toasts, and acoustic alerts.',
    category: 'system',
    riskLevel: 'low',
    icon: Bell,
    color: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  },
  {
    scope: 'device_control',
    name: 'Cross-Device & Mobile ADB Control',
    description: 'Bridge connected Android devices: Launch mobile apps, push files, and invoke ADB commands.',
    category: 'system',
    riskLevel: 'high',
    icon: Smartphone,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  },
  {
    scope: 'location',
    name: 'Device Location & Geolocation',
    description: 'Access device approximate coordinates, timezone, and regional context for weather and localized answers.',
    category: 'system',
    riskLevel: 'low',
    icon: MapPin,
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  },
];

export const formatLastAccessed = (timestamp?: number | null, by?: string | null): string => {
  if (!timestamp) return 'Never accessed';
  const now = Date.now() / 1000;
  const diff = Math.max(0, Math.floor(now - timestamp));
  let timeStr = '';
  if (diff < 60) timeStr = 'Just now';
  else if (diff < 3600) timeStr = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) timeStr = `${Math.floor(diff / 3600)}h ago`;
  else {
    const d = new Date(timestamp * 1000);
    timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return by ? `${timeStr} by ${by}` : timeStr;
};
