/**
 * Type Guards for Runtime Validation
 *
 * These functions validate data at runtime, especially for JSONB fields
 * coming from Supabase where we need to narrow `Json` to specific types.
 */

import type { Json } from './database.types'
import type { PlayerEvaluation, ScoutingEvent } from '../types'

// ============================================================================
// Player Evaluation Guards
// ============================================================================

/**
 * Validates that an unknown value is a valid PlayerEvaluation
 */
export function isPlayerEvaluation(obj: unknown): obj is PlayerEvaluation {
  if (typeof obj !== 'object' || obj === null) return false

  const evaluation = obj as Record<string, unknown>

  return (
    typeof evaluation.score === 'number' &&
    typeof evaluation.collegeLevel === 'string' &&
    typeof evaluation.scholarshipTier === 'string' &&
    ['Tier 1', 'Tier 2', 'Tier 3'].includes(evaluation.scholarshipTier as string) &&
    Array.isArray(evaluation.recommendedPathways) &&
    Array.isArray(evaluation.strengths) &&
    Array.isArray(evaluation.weaknesses) &&
    typeof evaluation.nextAction === 'string' &&
    typeof evaluation.summary === 'string'
  )
}

/**
 * Safely parse evaluation from database Json, returns null if invalid
 */
export function parseEvaluation(json: Json | null | undefined): PlayerEvaluation | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  return isPlayerEvaluation(json) ? json : null
}

// ============================================================================
// Event Agenda/Checklist Guards
// ============================================================================

/**
 * Validates that an unknown value is a string array (agenda format)
 */
export function isStringArray(obj: unknown): obj is string[] {
  return Array.isArray(obj) && obj.every(item => typeof item === 'string')
}

/**
 * Validates a single checklist item
 */
export function isChecklistItem(obj: unknown): obj is { task: string; completed: boolean } {
  if (typeof obj !== 'object' || obj === null) return false
  const item = obj as Record<string, unknown>
  return typeof item.task === 'string' && typeof item.completed === 'boolean'
}

/**
 * Validates that an unknown value is a checklist array
 */
export function isChecklistArray(obj: unknown): obj is { task: string; completed: boolean }[] {
  return Array.isArray(obj) && obj.every(isChecklistItem)
}

/**
 * Safely parse agenda from database Json
 */
export function parseAgenda(json: Json | null | undefined): string[] | null {
  if (!json) return null
  return isStringArray(json) ? json : null
}

/**
 * Safely parse checklist from database Json
 */
export function parseChecklist(json: Json | null | undefined): { task: string; completed: boolean }[] | null {
  if (!json) return null
  return isChecklistArray(json) ? json : null
}

// ============================================================================
// Event Type Guards
// ============================================================================

const VALID_EVENT_TYPES = ['ID Day', 'Showcase', 'Camp', 'Tournament'] as const
export type EventType = typeof VALID_EVENT_TYPES[number]

/**
 * Validates that a string is a valid event type
 */
export function isEventType(value: unknown): value is ScoutingEvent['type'] {
  return typeof value === 'string' && VALID_EVENT_TYPES.includes(value as EventType)
}

/**
 * Safely parse event type with fallback
 */
export function parseEventType(value: unknown, fallback: ScoutingEvent['type'] = 'Showcase'): ScoutingEvent['type'] {
  return isEventType(value) ? value : fallback
}

// ============================================================================
// Position Guards
// ============================================================================

const VALID_POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'CF', 'ST',
  'Unknown'
] as const
export type PlayerPosition = typeof VALID_POSITIONS[number]

/**
 * Validates that a string is a valid player position
 */
export function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'string' && VALID_POSITIONS.includes(value as PlayerPosition)
}

/**
 * Safely parse position with fallback
 */
export function parsePosition(value: unknown, fallback: PlayerPosition = 'Unknown'): PlayerPosition {
  return isPlayerPosition(value) ? value : fallback
}

// ============================================================================
// JSON Conversion Helpers (for sending TO database)
// ============================================================================

/**
 * Convert typed agenda array to Json for database storage
 * TypeScript knows string[] is compatible with Json, but needs explicit assertion
 */
export function agendaToJson(agenda: string[] | null | undefined): Json | null {
  return agenda ?? null
}

/**
 * Convert typed checklist array to Json for database storage
 */
export function checklistToJson(checklist: { task: string; completed: boolean }[] | null | undefined): Json | null {
  return checklist ?? null
}

/**
 * Convert typed evaluation to Json for database storage
 */
export function evaluationToJson(evaluation: PlayerEvaluation | null | undefined): Json | null {
  return (evaluation as unknown as Json) ?? null
}
