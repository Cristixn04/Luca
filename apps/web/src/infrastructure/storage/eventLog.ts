import type { VaultService } from '../vault/vaultService';

export const INTERACTION_EVENT_TYPES = [
  'measurements_updated',
  'garment_added',
  'garment_edited',
  'garment_deleted',
  'wear_logged',
  'outfit_liked',
  'outfit_disliked',
  'outfit_saved',
  'outfit_dismissed',
  'preference_updated',
] as const;

export type InteractionEventType = (typeof INTERACTION_EVENT_TYPES)[number];

export interface InteractionEvent {
  readonly id: string;
  readonly type: InteractionEventType;
  readonly at: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly schemaVersion: 1;
}

export interface TasteSnapshot {
  readonly id: string;
  readonly month: string;
  readonly eventCount: number;
  readonly typeCounts: Readonly<Record<string, number>>;
  readonly featureCounts: Readonly<Record<string, number>>;
  readonly compactedAt: string;
}

export interface CompactionSummary {
  readonly compactedEvents: number;
  readonly remainingEvents: number;
  readonly updatedMonths: readonly string[];
}

function generateEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function extractMonthKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 7);
}

/**
 * Añade un evento al registro de solo añadir (`interaction_event`).
 */
export async function appendInteractionEvent(
  vault: VaultService,
  input: {
    readonly type: InteractionEventType;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly at?: string;
    readonly id?: string;
  },
): Promise<InteractionEvent> {
  const event: InteractionEvent = {
    id: input.id ?? generateEventId(),
    type: input.type,
    at: input.at ?? new Date().toISOString(),
    payload: input.payload ?? {},
    schemaVersion: 1,
  };

  await vault.putRecord('interaction_event', event.id, event);
  return event;
}

export async function listInteractionEvents(vault: VaultService): Promise<InteractionEvent[]> {
  const events = await vault.listRecords<InteractionEvent>('interaction_event');
  return [...events].sort((a, b) => a.at.localeCompare(b.at));
}

export async function listTasteSnapshots(vault: VaultService): Promise<TasteSnapshot[]> {
  const snapshots = await vault.listRecords<TasteSnapshot>('taste_snapshot');
  return [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Compacta eventos anteriores a `cutoffIso` en agregados mensuales `TASTE_SNAPSHOT`
 * y elimina los eventos crudos ya compactados.
 */
export async function compactInteractionEvents(
  vault: VaultService,
  cutoffIso: string,
  nowIso: string = new Date().toISOString(),
): Promise<CompactionSummary> {
  const allEvents = await listInteractionEvents(vault);
  const toCompact = allEvents.filter((event) => event.at < cutoffIso);

  if (toCompact.length === 0) {
    return {
      compactedEvents: 0,
      remainingEvents: allEvents.length,
      updatedMonths: [],
    };
  }

  const byMonth = new Map<string, InteractionEvent[]>();
  for (const event of toCompact) {
    const month = extractMonthKey(event.at);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(event);
    byMonth.set(month, bucket);
  }

  const updatedMonths: string[] = [];

  for (const [month, events] of byMonth.entries()) {
    const existing = await vault.getRecord<TasteSnapshot>('taste_snapshot', month);
    const typeCounts: Record<string, number> = { ...(existing?.typeCounts ?? {}) };
    const featureCounts: Record<string, number> = { ...(existing?.featureCounts ?? {}) };

    for (const event of events) {
      typeCounts[event.type] = (typeCounts[event.type] ?? 0) + 1;

      const features = event.payload.features;
      if (Array.isArray(features)) {
        for (const feature of features) {
          if (typeof feature === 'string' && feature.length > 0) {
            featureCounts[feature] = (featureCounts[feature] ?? 0) + 1;
          }
        }
      }
    }

    const snapshot: TasteSnapshot = {
      id: month,
      month,
      eventCount: (existing?.eventCount ?? 0) + events.length,
      typeCounts,
      featureCounts,
      compactedAt: nowIso,
    };

    await vault.putRecord('taste_snapshot', month, snapshot);
    updatedMonths.push(month);
  }

  for (const event of toCompact) {
    await vault.deleteRecord('interaction_event', event.id);
  }

  return {
    compactedEvents: toCompact.length,
    remainingEvents: allEvents.length - toCompact.length,
    updatedMonths: updatedMonths.sort(),
  };
}
