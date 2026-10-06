/**
 * Seyal AI � High-Performance Resilient Connection Manager.
 * 
 * Implements ChatGPT/Gemini-grade connection architecture:
 * - Method A: Native Hardware Network Listener (window.ononline / window.onoffline)
 * - Method B: Passive On-Demand Health Monitoring (no CPU-burning 5s polling loop, no false-alarm yellow bars)
 * - Method C: Silent Auto-Recovery & Stream Resiliency
 */

import { api } from './api';
import type { HealthResponse } from '../types';

export type ConnectionState = 
  | 'STARTING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'OFFLINE'
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
  private isDestroyed = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.setupHardwareListeners();
  }

  /**
   * Method A: Hardware Network Detection (Instant zero-CPU detection)
   */
  private setupHardwareListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[ConnectionManager] Hardware network restored (online)');
      this.isOnline = true;
      this.consecutiveFailures = 0;
      this.checkHealth();
    });

    window.addEventListener('offline', () => {
      console.log('[ConnectionManager] Hardware network disconnected (offline)');
      this.isOnline = false;
      this.setState('OFFLINE');
    });

    // On window focus (user switches back to Seyal AI), verify liveness once on-demand
    window.addEventListener('focus', () => {
      if (this.state !== 'CONNECTED') {
        this.checkHealth();
      }
    });
  }

  public start() {
    this.isDestroyed = false;
    this.checkHealth();
  }

  public stop() {
    this.isDestroyed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
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

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  private setState(nextState: ConnectionState) {
    if (this.state !== nextState) {
      console.log(`[ConnectionManager] ${this.state} -> ${nextState}`);
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
   * Method B: Intelligent On-Demand Health Probe
   * Only transitions to RECONNECTING after 3 consecutive hard failures
   * Never flashes false-alarm yellow bars on momentary task latencies
   */
  public async checkHealth(): Promise<boolean> {
    if (this.isDestroyed) return false;

    // If hardware is offline, immediately remain OFFLINE
    if (!this.isOnline) {
      this.setState('OFFLINE');
      return false;
    }

    try {
      const data = await api.getHealth();
      this.healthData = data;
      this.consecutiveFailures = 0;
      this.setState('CONNECTED');
      return true;
    } catch {
      this.consecutiveFailures += 1;

      // Only alert if there are 3 consecutive failures (debounce false alarms)
      if (this.consecutiveFailures >= 3) {
        this.setState('RECONNECTING');
      }

      // If backend is still starting up, retry with gentle backoff
      if (this.state === 'STARTING' || this.state === 'RECONNECTING') {
        const delay = Math.min(2000 * this.consecutiveFailures, 10000);
        this.scheduleNextCheck(delay);
      }
      return false;
    }
  }

  /**
   * Method C: Called when real requests succeed or fail to keep state in sync
   */
  public recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state !== 'CONNECTED') {
      this.setState('CONNECTED');
    }
  }

  public recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= 3 && this.state !== 'RECONNECTING') {
      this.setState('RECONNECTING');
      this.scheduleNextCheck(3000);
    }
  }

  private scheduleNextCheck(delayMs: number) {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.isDestroyed) return;
    this.pollTimer = setTimeout(() => {
      this.checkHealth();
    }, delayMs);
  }
}

export const connectionManager = new ConnectionManager();
