/**
 * Seyal AI — Resilient Connection Manager.
 * 
 * Implements a ChatGPT-style decoupled state machine:
 * - Instant sub-millisecond local liveness check (/api/health)
 * - Decoupled background subsystem check (/api/ready)
 * - Exponential backoff with jitter on disconnect
 * - Zero user action required (no manual Ctrl+R needed for auto-recovery)
 */

import { api } from './api';
import type { HealthResponse } from '../types';

export type ConnectionState = 
  | 'STARTING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'RECONNECTING';

export interface ReadinessInfo {
  status: 'ready' | 'degraded' | 'unknown';
  subsystems: Record<string, any>;
}

type StateListener = (state: ConnectionState, health: HealthResponse | null, ready: ReadinessInfo | null) => void;

class ConnectionManager {
  private state: ConnectionState = 'STARTING';
  private healthData: HealthResponse | null = null;
  private readinessData: ReadinessInfo | null = null;
  private listeners: Set<StateListener> = new Set();
  
  private consecutiveFailures = 0;
  private pollTimer: any = null;
  private readyTimer: any = null;
  private isDestroyed = false;

  // Backoff intervals in ms
  private readonly backoffSchedule = [1000, 2000, 4000, 8000, 15000, 30000];

  public start() {
    this.isDestroyed = false;
    this.checkHealth();
    this.startReadinessPolling();
  }

  public stop() {
    this.isDestroyed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.readyTimer) clearInterval(this.readyTimer);
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.state, this.healthData, this.readinessData);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getHealth(): HealthResponse | null {
    return this.healthData;
  }

  public getReadiness(): ReadinessInfo | null {
    return this.readinessData;
  }

  private setState(nextState: ConnectionState) {
    if (this.state !== nextState) {
      console.log(`[ConnectionManager] ${this.state} ──► ${nextState}`);
      this.state = nextState;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, this.healthData, this.readinessData);
      } catch (err) {
        console.error('[ConnectionManager] Listener error:', err);
      }
    });
  }

  /**
   * Instant local liveness probe (/api/health)
   */
  public async checkHealth(): Promise<boolean> {
    if (this.isDestroyed) return false;

    try {
      const data = await api.getHealth();
      this.healthData = data;
      this.consecutiveFailures = 0;

      // Immediately recover if we were reconnecting or starting
      if (this.readinessData?.status === 'degraded') {
        this.setState('DEGRADED');
      } else {
        this.setState('CONNECTED');
      }

      // Schedule next standard check (5 seconds when connected)
      this.scheduleNextCheck(5000);
      return true;
    } catch {
      this.consecutiveFailures += 1;
      
      if (this.state === 'STARTING') {
        // Give initial grace period of 3 quick attempts before switching to RECONNECTING
        if (this.consecutiveFailures >= 3) {
          this.setState('RECONNECTING');
        }
      } else {
        this.setState('RECONNECTING');
      }

      // Exponential backoff with random jitter (+/- 20%)
      const backoffIdx = Math.min(this.consecutiveFailures - 1, this.backoffSchedule.length - 1);
      const baseDelay = this.backoffSchedule[Math.max(0, backoffIdx)];
      const jitter = (Math.random() * 0.4 - 0.2) * baseDelay;
      const nextDelay = Math.max(1000, Math.round(baseDelay + jitter));

      this.scheduleNextCheck(nextDelay);
      return false;
    }
  }

  private scheduleNextCheck(delayMs: number) {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.isDestroyed) return;
    this.pollTimer = setTimeout(() => {
      this.checkHealth();
    }, delayMs);
  }

  /**
   * Decoupled background probe for subsystem dependencies (/api/ready)
   */
  private startReadinessPolling() {
    const probeReady = async () => {
      if (this.isDestroyed || this.state === 'RECONNECTING') return;
      try {
        const ready = await api.getReady();
        this.readinessData = {
          status: (ready.status as any) || 'ready',
          subsystems: ready.subsystems || {},
        };
        if (this.state === 'CONNECTED' && ready.status === 'degraded') {
          this.setState('DEGRADED');
        } else if (this.state === 'DEGRADED' && ready.status === 'ready') {
          this.setState('CONNECTED');
        }
      } catch {
        // Readiness notice does not break localhost connection state
      }
    };

    // Initial probe after 3 seconds, then every 20 seconds
    setTimeout(probeReady, 3000);
    this.readyTimer = setInterval(probeReady, 20000);
  }
}

export const connectionManager = new ConnectionManager();
