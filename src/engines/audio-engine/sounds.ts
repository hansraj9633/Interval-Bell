import {SoundCategory, SoundDefinition, SoundId} from '../../types';

export const SOUND_CATEGORIES: readonly SoundCategory[] = [
  'Bell',
  'Nature',
  'Ambient',
  'Minimal',
] as const;

export const SOUND_LIBRARY: readonly SoundDefinition[] = [
  {
    id: 'soft-bell',
    name: 'Tibetan Singing Bowl',
    category: 'Bell',
    description: 'Warm bronze fundamental with gentle harmonic overtones.',
    loopIntervalMs: 3200,
    durationLabel: '2.8s',
  },
  {
    id: 'classic-bell',
    name: 'Kyoto Temple Bell',
    category: 'Bell',
    description: 'Deep resonant strike that anchors wandering attention.',
    loopIntervalMs: 3400,
    durationLabel: '3.2s',
  },
  {
    id: 'double-bell',
    name: 'Twin Mindfulness Chime',
    category: 'Bell',
    description: 'Two spaced strikes to gently invite posture awareness.',
    loopIntervalMs: 3200,
    durationLabel: '2.6s',
  },
  {
    id: 'soft-chime',
    name: 'Pentatonic Wind Chime',
    category: 'Ambient',
    description: 'Three ascending intervals in a calming major pentatonic scale.',
    loopIntervalMs: 3200,
    durationLabel: '2.4s',
  },
  {
    id: 'gentle-piano',
    name: 'Felt Piano Triad',
    category: 'Ambient',
    description: 'Muted felt hammer chord voiced softly in D major.',
    loopIntervalMs: 3400,
    durationLabel: '2.8s',
  },
  {
    id: 'birds',
    name: 'Dawn Woodland Birds',
    category: 'Nature',
    description: 'Morning songbird calls with soft natural spacing.',
    loopIntervalMs: 3200,
    durationLabel: '2.5s',
  },
  {
    id: 'rain',
    name: 'Quiet Rainfall',
    category: 'Nature',
    description: 'Steady soft rainfall swell paired with a gentle droplet pulse.',
    loopIntervalMs: 3200,
    durationLabel: '2.8s',
  },
  {
    id: 'forest',
    name: 'Pine Canopy Breeze',
    category: 'Nature',
    description: 'Gentle wind through pines with warm harmonic resonance.',
    loopIntervalMs: 3400,
    durationLabel: '3.0s',
  },
  {
    id: 'digital-beep',
    name: 'Harmonic Pulse',
    category: 'Minimal',
    description: 'Clean dual-tone acoustic cue with soft envelope.',
    loopIntervalMs: 2200,
    durationLabel: '0.8s',
  },
  {
    id: 'short-beep',
    name: 'Warm Woodblock',
    category: 'Minimal',
    description: 'Crisp organic percussion tap for subtle cadence.',
    loopIntervalMs: 2000,
    durationLabel: '0.6s',
  },
] as const;

export function getSoundById(id: SoundId): SoundDefinition {
  return SOUND_LIBRARY.find((s) => s.id === id) ?? SOUND_LIBRARY[0];
}
