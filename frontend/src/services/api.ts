/**
 * Unified API Services Entrypoint
 * Re-exports the modular API client and all sub-domain modules.
 * Maintains 100% backward compatibility with existing imports across the application.
 */
export * from './api/index';
export { default, api } from './api/index';
