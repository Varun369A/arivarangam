// Character types for the arena — used by ArenaCanvas (vanilla Three.js) and useArenaStream.
// R3F implementation removed; all 3D rendering is handled imperatively in ArenaCanvas.tsx.

export type CharacterAction =
  | 'idle'
  | 'walking'
  | 'talking'
  | 'waving'
  | 'thinking'
  | 'pointing'
  | 'celebrating'
  | 'listening'
  | 'calling'

export interface CharacterState {
  action: CharacterAction
  targetPosition: [number, number, number] | null
  speech: string | null
}
