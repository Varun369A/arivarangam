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
    color: '#D97706',
    glowColor: '#F59E0B',
    skinColor: '#F5CBA7',
    homePosition: [0, 0, 0],
    meetPosition: [0, 0, 0],
    greetings: [
      "Welcome! What shall we build today?",
      "Ready to create something amazing — tell me your vision!",
      "I'm here and ready. What are we making?",
    ],
    thinkingPhrases: [
      "Let me think through this carefully and plan the best approach.",
      "I need your expertise here — can you go deeper on that?",
      "Interesting. Let me factor this into the plan.",
    ],
    workingPhrases: [
      "Building your project now — watch the code come to life!",
      "Writing every file with care. Almost there!",
      "Putting the finishing touches on the code.",
    ],
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    role: 'Researcher',
    description: 'I find real-time information and deep research',
    color: '#0D9488',
    glowColor: '#14B8A6',
    skinColor: '#EBD5BC',
    homePosition: [55, 0, 8],
    meetPosition: [2.2, 0, 0.5],
    greetings: [
      "I scanned hundreds of sources and found exactly what you need.",
      "Research complete — here are my key findings for this task.",
      "I searched the entire web. Here's a summary of the best information.",
    ],
    thinkingPhrases: [
      "Let me think through this carefully and plan the best approach.",
      "That's a great follow-up. Let me cross-reference more sources on that specific point.",
      "I'm compiling the most relevant research across multiple domains.",
    ],
    workingPhrases: [
      "Searching across live databases, forums, papers, and documentation right now.",
      "Cross-referencing data to make sure everything is accurate and up-to-date.",
      "Digging deeper into this — there are some important nuances to highlight.",
    ],
  },

  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    role: 'Advisor',
    description: 'I provide ideas, suggestions, and creative directions',
    color: '#10B981',
    glowColor: '#34D399',
    skinColor: '#F0B07A',
    homePosition: [55, 0, -8],
    meetPosition: [2.2, 0, -0.5],
    greetings: [
      "I have a strong perspective on this — let me walk you through my reasoning.",
      "Great task! I've already thought of three solid approaches you should consider.",
      "Here's my take — I think the best direction is something you might not expect.",
    ],
    thinkingPhrases: [
      "Let me think through this carefully from multiple angles.",
      "That's worth digging into. Let me explore the tradeoffs more deeply.",
      "I'm weighing several creative solutions — here's the one that stands out most.",
    ],
    workingPhrases: [
      "Here's my recommended approach and the reasoning behind each decision.",
      "Consider this architecture — it balances simplicity with long-term scalability.",
      "I'm refining the suggestion based on what you need. This should fit perfectly.",
    ],
  },

  gemini: {
    id: 'gemini',
    name: 'Gemini',
    role: 'Visualizer',
    description: 'I handle visual, multimodal, and design tasks',
    color: '#8B5CF6',
    glowColor: '#A78BFA',
    skinColor: '#D4A76A',
    homePosition: [-55, 0, -8],
    meetPosition: [-2.2, 0, -0.5],
    greetings: [
      "I can already picture the visual structure — it's going to look stunning.",
      "The design concept is clear in my mind. Let me lay out the visual plan.",
      "I see exactly how this should look and feel. Here's my visual blueprint.",
    ],
    thinkingPhrases: [
      "Let me think through this carefully to map out the layout and components.",
      "Good point — let me revisit the color system and visual hierarchy for this.",
      "I'm factoring in both aesthetics and usability as I plan this design.",
    ],
    workingPhrases: [
      "Mapping out the design system: colors, typography, spacing, and component structure.",
      "Processing the visual flow — every interaction and transition has been considered.",
      "Applying the design principles to every screen and state of this interface.",
    ],
  },

  sarvam: {
    id: 'sarvam',
    name: 'Sarvam',
    role: 'Translator',
    description: 'I bridge all Indian languages with the team',
    color: '#F59E0B',
    glowColor: '#FBBF24',
    skinColor: '#C47B3E',
    homePosition: [-55, 0, 8],
    meetPosition: [-2.2, 0, 0.5],
    greetings: [
      "நான் உதவ தயாராக இருக்கிறேன்! I understand the full context — let me translate.",
      "मैं समझ गया! I've translated the request and will explain it clearly to Claude.",
      "I understood every word. The meaning is fully clear — I'll bridge this perfectly.",
    ],
    thinkingPhrases: [
      "Let me think through this carefully — language and cultural context both matter here.",
      "Translating requires understanding the intent, not just the words. Let me be precise.",
      "I want to make sure nothing is lost in translation. Let me verify the full meaning.",
    ],
    workingPhrases: [
      "Translating the request precisely — capturing both language and cultural nuance.",
      "Passing the fully translated message to Claude now. Everything is preserved.",
      "The translation is complete. Claude now has full context to build what you need.",
    ],
  },
}

export const CHARACTER_ORDER: CharacterId[] = ['claude', 'perplexity', 'chatgpt', 'gemini', 'sarvam']
