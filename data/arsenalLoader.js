/**
 * 🔫 Arsenal Database Loader — Banseok-2 Creative DNA Engine
 * 
 * Utility module for querying and injecting the 100 Creative DNAs
 * into GPT-4o Vision system prompts based on product analysis.
 * 
 * Usage:
 *   import { getArsenalById, getArsenalByPhase, getRandomArsenal, buildArsenalPrompt } from '@/data/arsenalLoader';
 */

import arsenalData from './Arsenal_Database.json';

// Flatten all items for fast lookup
const ALL_ITEMS = arsenalData.arsenal_database.flatMap(phase => 
  phase.items.map(item => ({ ...item, phase: phase.phase }))
);

// Index by ID for O(1) lookup
const ID_INDEX = Object.fromEntries(ALL_ITEMS.map(item => [item.id, item]));

/**
 * Get a single arsenal item by ID (e.g., "A-042")
 */
export function getArsenalById(id) {
  return ID_INDEX[id] || null;
}

/**
 * Get all items from a specific phase (1-10)
 */
export function getArsenalByPhase(phaseNumber) {
  const phase = arsenalData.arsenal_database[phaseNumber - 1];
  return phase ? phase.items : [];
}

/**
 * Get N random arsenal items (for AI Curator mode)
 */
export function getRandomArsenal(count = 3) {
  const shuffled = [...ALL_ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, ALL_ITEMS.length));
}

/**
 * Get arsenal items matching a keyword in name or description
 */
export function searchArsenal(keyword) {
  const lower = keyword.toLowerCase();
  return ALL_ITEMS.filter(item => 
    item.name.toLowerCase().includes(lower) || 
    item.description.toLowerCase().includes(lower)
  );
}

/**
 * Build a combined prompt_inject string from an array of Arsenal IDs.
 * This is the core function used by the GPT-4o Vision pipeline.
 * 
 * @param {string[]} ids - Array of arsenal IDs (e.g., ["A-007", "A-042", "A-091"])
 * @returns {string} Combined prompt injection string
 */
export function buildArsenalPrompt(ids) {
  if (!ids || ids.length === 0) return '';
  
  const prompts = ids
    .map(id => ID_INDEX[id])
    .filter(Boolean)
    .map((item, i) => `[ARSENAL ${item.id} — ${item.name}]: ${item.prompt_inject}`);

  return `\n\n--- ARSENAL CREATIVE DNA INJECTION ---\n${prompts.join('\n')}\n--- END ARSENAL ---`;
}

/**
 * AI-powered arsenal selection based on product category keywords.
 * Maps common product types to recommended arsenal combinations.
 */
export function getRecommendedArsenal(productKeywords) {
  const lower = productKeywords.toLowerCase();
  
  const RECOMMENDATIONS = {
    luxury:     ['A-004', 'A-008', 'A-031', 'A-043', 'A-072', 'A-081'],
    food:       ['A-042', 'A-056', 'A-071', 'A-013', 'A-089', 'A-037'],
    tech:       ['A-054', 'A-051', 'A-043', 'A-068', 'A-097', 'A-031'],
    fashion:    ['A-017', 'A-021', 'A-038', 'A-049', 'A-048', 'A-044'],
    beauty:     ['A-042', 'A-044', 'A-049', 'A-089', 'A-079', 'A-037'],
    automotive: ['A-091', 'A-093', 'A-004', 'A-064', 'A-067', 'A-095'],
    health:     ['A-085', 'A-007', 'A-084', 'A-083', 'A-090', 'A-055'],
    gaming:     ['A-025', 'A-022', 'A-023', 'A-050', 'A-045', 'A-094'],
    education:  ['A-040', 'A-015', 'A-070', 'A-066', 'A-034', 'A-090'],
    startup:    ['A-018', 'A-036', 'A-041', 'A-082', 'A-086', 'A-026'],
  };

  for (const [category, ids] of Object.entries(RECOMMENDATIONS)) {
    if (lower.includes(category)) {
      return ids.map(id => ID_INDEX[id]).filter(Boolean);
    }
  }

  // Default: return the Singularity + 4 random picks
  return [ID_INDEX['A-100'], ...getRandomArsenal(4)];
}

/**
 * Get full database metadata
 */
export function getArsenalMeta() {
  return {
    project: arsenalData.project,
    version: arsenalData.version,
    totalItems: ALL_ITEMS.length,
    phases: arsenalData.arsenal_database.map(p => ({
      name: p.phase,
      itemCount: p.items.length,
      ids: p.items.map(i => i.id),
    })),
  };
}

export default arsenalData;
