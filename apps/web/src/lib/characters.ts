// ─── AI Character Configurations ─────────────────────────────────────────────
// Each AI model is represented as a unique physical character in the 3D arena.

export type CharacterId = 'claude' | 'perplexity' | 'chatgpt' | 'gemini' | 'sarvam'

export interface CharacterConfig {
  id: CharacterId
  name: string
  role: string
  description: string           // what this AI does
  color: string                 // primary body/accent color
  glowColor: string             // point light color
  skinColor: string             // face/hand skin tone
  homePosition: [number, number, number]
  meetPosition: [number, number, number]  // where they walk when called by Claude
  greetings: string[]           // rotating greeting phrases
  thinkingPhrases: string[]
  workingPhrases: string[]
}

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    role: 'Builder',
    description: 'I design, plan, and build your entire project',
    color: '#D97706',           // warm amber — Anthropic brand
    glowColor: '#F59E0B',
    skinColor: '#FBBF24',
    homePosition: [0, 0, 0],
    meetPosition: [0, 0, 0],   // Claude stays at center
    greetings: [
      "Welcome back! What shall we build today?",
      "Ready to create something great. What's your vision?",
      "Tell me what you need — I'll make it happen.",
    ],
    thinkingPhrases: [
      "Let me think through this carefully...",
      "Planning the best approach...",
      "Analyzing your requirements...",
    ],
    workingPhrases: [
      "Building your project now...",
      "Writing the code...",
      "Almost there...",
    ],
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    role: 'Researcher',
    description: 'I find real-time information and deep research',
    color: '#0D9488',           // teal
    glowColor: '#14B8A6',
    skinColor: '#5EEAD4',
    homePosition: [55, 0, 8],   // off-screen right — walks in when called
    meetPosition: [2.2, 0, 0.5],
    greetings: [
      "Research incoming!",
      "I found exactly what you need.",
      "Data gathered and ready.",
    ],
    thinkingPhrases: [
      "Searching across the web...",
      "Cross-referencing sources...",
      "Compiling research...",
    ],
    workingPhrases: [
      "Found relevant results...",
      "Analyzing data...",
    ],
  },

  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    role: 'Advisor',
    description: 'I provide ideas, suggestions, and creative directions',
    color: '#10B981',           // emerald green — OpenAI brand
    glowColor: '#34D399',
    skinColor: '#6EE7B7',
    homePosition: [55, 0, -8],
    meetPosition: [2.2, 0, -0.5],
    greetings: [
      "Here's my perspective on this!",
      "Great idea — let me expand on it.",
      "I have a few suggestions...",
    ],
    thinkingPhrases: [
      "Thinking creatively...",
      "Exploring different angles...",
      "Generating ideas...",
    ],
    workingPhrases: [
      "Here's what I recommend...",
      "Consider this approach...",
    ],
  },

  gemini: {
    id: 'gemini',
    name: 'Gemini',
    role: 'Visualizer',
    description: 'I handle visual, multimodal, and design tasks',
    color: '#8B5CF6',           // violet — Google brand
    glowColor: '#A78BFA',
    skinColor: '#C4B5FD',
    homePosition: [-55, 0, -8],
    meetPosition: [-2.2, 0, -0.5],
    greetings: [
      "I can see the design clearly!",
      "Visual coming right up.",
      "Let me imagine this for you.",
    ],
    thinkingPhrases: [
      "Visualizing the concept...",
      "Processing the design...",
      "Mapping the visual space...",
    ],
    workingPhrases: [
      "Designing the layout...",
      "Applying visual elements...",
    ],
  },

  sarvam: {
    id: 'sarvam',
    name: 'Sarvam',
    role: 'Translator',
    description: 'I bridge all Indian languages with the team',
    color: '#F59E0B',           // saffron/gold
    glowColor: '#FBBF24',
    skinColor: '#FCD34D',
    homePosition: [-55, 0, 8],
    meetPosition: [-2.2, 0, 0.5],
    greetings: [
      "நான் உதவ தயாராக இருக்கிறேன்!",
      "मैं समझ गया! Claude को बताता हूँ।",
      "I've translated everything for Claude.",
    ],
    thinkingPhrases: [
      "Translating your message...",
      "Understanding your language...",
    ],
    workingPhrases: [
      "Passing the message to Claude...",
      "Translation complete.",
    ],
  },
}

export const CHARACTER_ORDER: CharacterId[] = ['claude', 'perplexity', 'chatgpt', 'gemini', 'sarvam']
