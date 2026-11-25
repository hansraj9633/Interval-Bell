import {z} from 'zod';
import {SessionConfig, SoundId} from '../types';

export const SOUND_IDS: readonly SoundId[] = [
  'soft-bell',
  'classic-bell',
  'double-bell',
  'birds',
  'rain',
  'forest',
  'soft-chime',
  'gentle-piano',
  'digital-beep',
  'short-beep',
] as const;

export const sessionConfigSchema = z
  .object({
    name: z.string().max(80, 'Session name must be 80 characters or fewer.'),
    durationSec: z
      .number({error: 'Session duration must be a valid number.'})
      .int('Session duration must be a whole number of seconds.')
      .min(10, 'Session duration must be at least 10 seconds.')
      .max(86400, 'Session duration cannot exceed 24 hours.'),
    intervalSec: z
      .number({error: 'Reminder interval must be a valid number.'})
      .int('Reminder interval must be a whole number of seconds.')
      .min(5, 'Reminder interval must be at least 5 seconds.')
      .max(43200, 'Reminder interval cannot exceed 12 hours.'),
    soundId: z.enum([
      'soft-bell',
      'classic-bell',
      'double-bell',
      'birds',
      'rain',
      'forest',
      'soft-chime',
      'gentle-piano',
      'digital-beep',
      'short-beep',
    ]),
    soundEnabled: z.boolean(),
    vibrationEnabled: z.boolean(),
    volume: z.number().min(0).max(1),
    alertMode: z.enum(['once', 'continuous']).default('once'),
  })
  .refine((data) => data.intervalSec < data.durationSec, {
    message: 'Reminder interval must be shorter than the total session duration.',
    path: ['intervalSec'],
  });

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof SessionConfig | 'form', string>>;
  data?: SessionConfig;
}

export function validateSessionConfig(input: SessionConfig): ValidationResult {
  const parsed = sessionConfigSchema.safeParse(input);
  if (parsed.success) {
    return {
      valid: true,
      errors: {},
      data: {
        ...parsed.data,
        name: parsed.data.name.trim(),
      },
    };
  }

  const errors: Partial<Record<keyof SessionConfig | 'form', string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof SessionConfig | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    } else if (!errors.form) {
      errors.form = issue.message;
    }
  }

  return {
    valid: false,
    errors,
  };
}
