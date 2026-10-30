import { resolveApiBase, API_BASE, apiClient } from './client';
import { chatApi } from './chat';
import { voiceApi } from './voice';
import { computerUseApi } from './computerUse';
import { devicesApi } from './devices';
import { mcpApi } from './mcp';
import { automationApi } from './automation';
import { systemApi } from './system';
import { safetyApi } from './safety';
import { personalizationApi } from './personalization';

export { resolveApiBase, API_BASE, apiClient };
export { chatApi } from './chat';
export { voiceApi } from './voice';
export { computerUseApi } from './computerUse';
export { devicesApi } from './devices';
export { mcpApi } from './mcp';
export { automationApi } from './automation';
export { systemApi } from './system';
export { safetyApi } from './safety';
export { personalizationApi } from './personalization';

export const api = {
  // System Health & Liveness
  getHealth: systemApi.getHealth,
  getReady: systemApi.getReady,

  // Identity & Assistant Name Management
  getIdentity: personalizationApi.getIdentity,
  updateIdentity: personalizationApi.updateIdentity,
  requestNameChange: personalizationApi.requestNameChange,
  confirmPendingAction: personalizationApi.confirmPendingAction,
  cancelPendingConfirmation: personalizationApi.cancelPendingConfirmation,
  addAlias: personalizationApi.addAlias,
  removeAlias: personalizationApi.removeAlias,

  // Chat & Conversation
  sendMessage: chatApi.sendMessage,
  sendMessageStream: chatApi.sendMessageStream,
  resetChat: chatApi.resetChat,
  listConversations: chatApi.listConversations,
  getConversation: chatApi.getConversation,
  exportConversation: chatApi.exportConversation,
  getConversationOverview: chatApi.getConversationOverview,
  deleteConversation: chatApi.deleteConversation,
  batchDeleteConversations: chatApi.batchDeleteConversations,
  purgeAllConversations: chatApi.purgeAllConversations,
  updateConversation: chatApi.updateConversation,
  generateDynamicTitle: chatApi.generateDynamicTitle,

  // Laptop Agent & System Control
  getLaptopStatus: devicesApi.getLaptopStatus,
  listLaptopTools: devicesApi.listLaptopTools,
  executeLaptopTool: devicesApi.executeLaptopTool,

  // Voice Pipeline & Speech Synthesis
  getVoiceStatus: voiceApi.getVoiceStatus,
  getVoiceConfig: voiceApi.getVoiceConfig,
  updateVoiceConfig: voiceApi.updateVoiceConfig,
  startVoice: voiceApi.startVoice,
  stopVoice: voiceApi.stopVoice,
  synthesizeSpeech: voiceApi.synthesizeSpeech,
  transcribeAudio: voiceApi.transcribeAudio,

  // Unified Device Ecosystem
  listDevices: devicesApi.listDevices,

  // Conversational Computer-Use Agent
  getComputerUseStatus: computerUseApi.getComputerUseStatus,
  getComputerUseWelcome: computerUseApi.getComputerUseWelcome,
  runComputerUseGoal: computerUseApi.runComputerUseGoal,
  runComputerUseStream: computerUseApi.runComputerUseStream,
  steerComputerUse: computerUseApi.steerComputerUse,
  stopComputerUse: computerUseApi.stopComputerUse,
  observeScreenState: computerUseApi.observeScreenState,
  executeDirectAction: computerUseApi.executeDirectAction,
  getWelcomeGreeting: computerUseApi.getWelcomeGreeting,

  // User Profile
  getProfile: personalizationApi.getProfile,
  setupProfile: personalizationApi.setupProfile,

  // Laptop Awareness & Telemetry
  getLaptopAwareness: systemApi.getLaptopAwareness,
  scanLaptopAwareness: systemApi.scanLaptopAwareness,
  getLiveTelemetry: systemApi.getLiveTelemetry,
  getActiveWindow: systemApi.getActiveWindow,

  // Permissions Guardrails
  getPermissions: safetyApi.getPermissions,
  setPermissionMode: safetyApi.setPermissionMode,
  grantPermission: safetyApi.grantPermission,
  revokePermission: safetyApi.revokePermission,
  resetPermissions: safetyApi.resetPermissions,

  // Agent Planning & Task Management
  listTasks: safetyApi.listTasks,
  getTaskDetails: safetyApi.getTaskDetails,
  cancelTask: safetyApi.cancelTask,
  emergencyStopTasks: safetyApi.emergencyStopTasks,
  updateTaskPermission: safetyApi.updateTaskPermission,
  classifyTask: safetyApi.classifyTask,

  // User Knowledge & Rules Hub
  getUserHub: personalizationApi.getUserHub,
  setUserKnowledgeItem: personalizationApi.setUserKnowledgeItem,
  deleteUserKnowledgeItem: personalizationApi.deleteUserKnowledgeItem,
  addReminder: personalizationApi.addReminder,
  addOneTimeReminder: personalizationApi.addOneTimeReminder,
  completeAndRemoveReminder: personalizationApi.completeAndRemoveReminder,
  dismissOneTimeReminder: personalizationApi.dismissOneTimeReminder,
  addOrUpdateStandingRule: personalizationApi.addOrUpdateStandingRule,
  setStandingRule: personalizationApi.setStandingRule,
  toggleStandingRule: personalizationApi.toggleStandingRule,
  deleteStandingRule: personalizationApi.deleteStandingRule,

  // Model Context Protocol (MCP) Endpoints
  getMcpServers: mcpApi.getMcpServers,
  toggleMcpServer: mcpApi.toggleMcpServer,
  pingMcpServer: mcpApi.pingMcpServer,
  saveMcpServer: mcpApi.saveMcpServer,

  // Automation Routines Endpoints
  getAutomationRoutines: automationApi.getAutomationRoutines,
  runAutomationRoutine: automationApi.runAutomationRoutine,
  toggleAutomationRoutine: automationApi.toggleAutomationRoutine,

  // Storage & Maintenance Endpoints
  getStorageStats: systemApi.getStorageStats,
  cleanStorage: systemApi.cleanStorage,
  purgeConversations: systemApi.purgeConversations,
  wipeUserKnowledge: systemApi.wipeUserKnowledge,
  factoryReset: systemApi.factoryReset,

  // Notifications & Webhook Endpoints
  testWebhook: personalizationApi.testWebhook,
  getNotificationHistory: personalizationApi.getNotificationHistory,
  clearNotificationHistory: personalizationApi.clearNotificationHistory,

  // Personalization Endpoints
  getPersonalization: personalizationApi.getPersonalization,
  updatePersonalization: personalizationApi.updatePersonalization,

  // Safety Guardrails Endpoints
  getSafetySettings: safetyApi.getSafetySettings,
  updateSafetySettings: safetyApi.updateSafetySettings,
};

export default api;
