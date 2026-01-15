/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 * 
 * @module CircuitBreaker
 */

import { logger } from './logger.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;               // Time in ms before trying again (half-open)
  monitorInterval?: number;      // Time in ms between health checks
}

export interface CircuitStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalRequests: number;
  failedRequests: number;
  successRate: number;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      ...options,
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 3,
      timeout: options.timeout || 30000,
      monitorInterval: options.monitorInterval || 60000,
    };

    logger.info(`Circuit breaker initialized: ${this.options.name}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit ${this.options.name} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit ${this.options.name} is OPEN - service unavailable`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failures = 0;
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        logger.info(`Circuit ${this.options.name} CLOSED - service recovered`);
      }
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;
    this.failedRequests++;
    this.successes = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.warn(`Circuit ${this.options.name} OPEN - service still failing`);
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit ${this.options.name} OPEN - failure threshold reached`);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    // Auto-transition from OPEN to HALF_OPEN after timeout
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime >= this.options.timeout) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return {
      name: this.options.name,
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : undefined,
      lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime) : undefined,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      successRate: this.totalRequests > 0 
        ? Math.round(((this.totalRequests - this.failedRequests) / this.totalRequests) * 100) 
        : 100,
    };
  }

  /**
   * Force circuit to close (for manual recovery)
   */
  forceClose(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    logger.info(`Circuit ${this.options.name} force closed`);
  }

  /**
   * Force circuit to open (for maintenance)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
    logger.info(`Circuit ${this.options.name} force opened`);
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    return this.getState() !== 'OPEN';
  }
}

// ============================================
// Circuit Breaker Manager
// ============================================

class CircuitBreakerManager {
  private circuits: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuit(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, new CircuitBreaker({
        name,
        failureThreshold: options?.failureThreshold || 5,
        successThreshold: options?.successThreshold || 3,
        timeout: options?.timeout || 30000,
        monitorInterval: options?.monitorInterval || 60000,
      }));
    }
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit statistics
   */
  getAllStats(): CircuitStats[] {
    return Array.from(this.circuits.values()).map(c => c.getStats());
  }

  /**
   * Get overall health status
   */
  getHealthStatus(): {
    healthy: boolean;
    circuits: CircuitStats[];
    openCircuits: string[];
  } {
    const stats = this.getAllStats();
    const openCircuits = stats.filter(s => s.state === 'OPEN').map(s => s.name);
    
    return {
      healthy: openCircuits.length === 0,
      circuits: stats,
      openCircuits,
    };
  }

  /**
   * Reset all circuits (for testing/recovery)
   */
  resetAll(): void {
    this.circuits.forEach(circuit => circuit.forceClose());
    logger.info('All circuit breakers reset');
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();
export { CircuitBreaker };
export default circuitBreakerManager;
