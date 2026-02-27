export type ViewState = 'landing' | 'input' | 'loading' | 'report' | 'error' | 'history' | 'pricing' | 'settings' | 'auth' | 'dashboard' | 'help' | 'purchase_success' | 'chat' | 'marketing';

export interface CustomModelConfig {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  isPro: boolean;
  credits: number;
  joinedAt: number | string;
  avatarUrl?: string;
  preferences: {
    emailNotifications: boolean;
    marketingEmails: boolean;
    theme: 'light' | 'dark';
    customModels?: CustomModelConfig[];
  };
}

export interface Competitor {
  name: string;
  differentiation: string;
}

export interface ValidationReport {
  id: string;
  createdAt: number;
  originalIdea?: string; // Added to store the context for Chat
  summaryVerdict: 'Promising' | 'Risky' | 'Needs Refinement' | 'Unknown';
  oneLineTakeaway: string;
  marketReality: string;
  pros: string[];
  cons: string[];
  competitors: Competitor[];
  monetizationStrategies: string[];
  whyPeoplePay: string;
  viabilityScore: number; // 0-100
  nextSteps: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export const MOCK_REPORT: ValidationReport = {
  id: "mock-1",
  createdAt: Date.now(),
  originalIdea: "A unified productivity platform for marketing agencies that combines tasks, docs, and chat.",
  summaryVerdict: "Needs Refinement",
  oneLineTakeaway: "Great problem, but the solution is currently too broad.",
  marketReality: "The productivity market is saturated. Users are tired of 'all-in-one' tools and are looking for specialized workflows.",
  pros: ["Solves a genuine pain point for remote teams", "Low barrier to entry MVP", "Clear viral loop potential"],
  cons: ["Extremely high cost of customer acquisition", "Competitors have deep moats", "User retention is notoriously difficult in this vertical"],
  competitors: [
    { name: "Notion", differentiation: "More flexible, but higher learning curve" },
    { name: "Linear", differentiation: "Focused purely on engineering, yours is broader" },
    { name: "Trello", differentiation: "Simpler, but lacks the specific automation you proposed" }
  ],
  monetizationStrategies: ["Freemium with team limits", "Per-seat enterprise pricing", "Marketplace for templates"],
  whyPeoplePay: "Teams will pay to reduce the 'coordination tax' of switching between too many apps.",
  viabilityScore: 65,
  nextSteps: ["Narrow the target audience to just 'marketing agencies'", "Interview 10 agency owners about their current workflow", "Build a 'concierge MVP' before writing code"]
};