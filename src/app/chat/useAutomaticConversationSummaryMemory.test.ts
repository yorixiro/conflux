import { describe, expect, it } from 'vitest';
import { createPersonaTemplate } from '../../config/persona/personaBuilder';
import type { Conversation } from '../../types/domain';
import { resolveAutomaticConversationSummaryPlan } from './useAutomaticConversationSummaryMemory';

function conversation(id: string, collaboratorId: string, updatedAt: number): Conversation {
  return {
    id,
    title: id,
    collaboratorId,
    messages: [],
    pinnedAt: null,
    updatedAt
  };
}

describe('resolveAutomaticConversationSummaryPlan', () => {
  it('waits for all stores to hydrate before scheduling automatic summaries', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const plan = resolveAutomaticConversationSummaryPlan({
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 0 },
      releaseEnabled: true,
      startupReady: true,
      chatHydrated: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: false,
      dirtyConversationCount: 0,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [persona],
      conversations: [conversation('c1', 'mimo', 10)]
    });

    expect(plan.shouldRun).toBe(false);
    expect(plan.ready).toBe(false);
  });

  it('schedules only when automatic summaries are enabled and source conversations changed', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const base = {
      chatHydrated: true,
      startupReady: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: true,
      dirtyConversationCount: 0,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [persona],
      conversations: [conversation('c1', 'mimo', 20)]
    };

    expect(resolveAutomaticConversationSummaryPlan({
      ...base,
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 10 },
      releaseEnabled: true
    }).shouldRun).toBe(true);

    expect(resolveAutomaticConversationSummaryPlan({
      ...base,
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 20 },
      releaseEnabled: true
    }).shouldRun).toBe(false);

    expect(resolveAutomaticConversationSummaryPlan({
      ...base,
      settings: { enabled: true, autoUpdateEnabled: false, lastUpdatedAt: 10 },
      releaseEnabled: true
    }).shouldRun).toBe(false);
  });

  it('waits while source conversations still have pending persistence work', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const plan = resolveAutomaticConversationSummaryPlan({
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 0 },
      releaseEnabled: true,
      startupReady: true,
      chatHydrated: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: true,
      dirtyConversationCount: 1,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [persona],
      conversations: [conversation('c1', 'mimo', 20)]
    });

    expect(plan.ready).toBe(false);
    expect(plan.shouldRun).toBe(false);
  });

  it('skips collaborators that disabled cross-conversation recall', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const plan = resolveAutomaticConversationSummaryPlan({
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 0 },
      releaseEnabled: true,
      startupReady: true,
      chatHydrated: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: true,
      dirtyConversationCount: 0,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [{
        ...persona,
        memory: {
          ...persona.memory,
          crossConversationRecallEnabled: false
        }
      }],
      conversations: [conversation('c1', 'mimo', 20)]
    });

    expect(plan.collaboratorIds).toEqual([]);
    expect(plan.shouldRun).toBe(false);
  });

  it('stays off when an explicit release gate disables automatic summaries', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const plan = resolveAutomaticConversationSummaryPlan({
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 0 },
      releaseEnabled: false,
      startupReady: true,
      chatHydrated: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: true,
      dirtyConversationCount: 0,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [persona],
      conversations: [conversation('c1', 'mimo', 20)]
    });

    expect(plan.enabled).toBe(false);
    expect(plan.shouldRun).toBe(false);
  });

  it('waits for the app runtime startup gate before scheduling', () => {
    const persona = createPersonaTemplate({ id: 'mimo', name: 'Mimo', description: '' });
    const plan = resolveAutomaticConversationSummaryPlan({
      settings: { enabled: true, autoUpdateEnabled: true, lastUpdatedAt: 0 },
      releaseEnabled: true,
      startupReady: false,
      chatHydrated: true,
      personaHydrated: true,
      runtimeHydrated: true,
      collectionHydrated: true,
      dirtyConversationCount: 0,
      deletedConversationCount: 0,
      loadingConversationCount: 0,
      personas: [persona],
      conversations: [conversation('c1', 'mimo', 20)]
    });

    expect(plan.ready).toBe(false);
    expect(plan.shouldRun).toBe(false);
  });
});
