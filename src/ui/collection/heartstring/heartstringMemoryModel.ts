import type { Persona } from '../../../types/domain';

export type MemoryAtlasCounts = {
  entries: number;
  docs: number;
  summaries: number;
  indexed: number;
};

/** Counts only the currently stored metadata; does not infer relationships or read unloaded document bodies. */
export function countMemoryAtlasSources(memory: Persona['memory']): MemoryAtlasCounts {
  return {
    entries: memory.personalMemories.filter((entry) => entry.trim().length > 0).length,
    docs: memory.referenceDocs.length,
    summaries: memory.conversationSummaries.length,
    indexed: Math.max(0, memory.vectorIndex?.indexedChunkCount ?? 0)
  };
}
