import {SessionHistoryRecord, SessionPreset} from '../../types';
import {isPresetsSeeded, markPresetsSeeded} from './settingsStorage';

const DB_NAME = 'interval-bell-db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const PRESETS_STORE = 'presets';

const FALLBACK_SESSIONS_KEY = 'interval-bell:fallback-sessions';
const FALLBACK_PRESETS_KEY = 'interval-bell:fallback-presets';

const DEFAULT_STARTER_PRESETS: SessionPreset[] = [
  {
    id: 'preset-mindful-sitting',
    name: 'Mindful Sitting',
    durationSec: 1800,
    intervalSec: 600,
    soundId: 'classic-bell',
    soundEnabled: true,
    vibrationEnabled: true,
    volume: 0.85,
    isDefault: true,
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
  },
  {
    id: 'preset-deep-writing',
    name: 'Deep Writing Block',
    durationSec: 2700,
    intervalSec: 900,
    soundId: 'soft-bell',
    soundEnabled: true,
    vibrationEnabled: true,
    volume: 0.8,
    isDefault: true,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  },
  {
    id: 'preset-posture-check',
    name: 'Workday Posture Check',
    durationSec: 7200,
    intervalSec: 1800,
    soundId: 'soft-chime',
    soundEnabled: true,
    vibrationEnabled: false,
    volume: 0.75,
    isDefault: true,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
  {
    id: 'preset-focused-sprint',
    name: 'Focused Sprint',
    durationSec: 1500,
    intervalSec: 300,
    soundId: 'gentle-piano',
    soundEnabled: true,
    vibrationEnabled: true,
    volume: 0.8,
    isDefault: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = db.createObjectStore(SESSIONS_STORE, {keyPath: 'id'});
        store.createIndex('startedAt', 'startedAt', {unique: false});
      }
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        const store = db.createObjectStore(PRESETS_STORE, {keyPath: 'id'});
        store.createIndex('updatedAt', 'updatedAt', {unique: false});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

function readFallback<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeFallback<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function listSessionHistory(): Promise<SessionHistoryRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as SessionHistoryRecord[]).sort(
          (a, b) => b.startedAt - a.startedAt
        );
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return readFallback<SessionHistoryRecord>(FALLBACK_SESSIONS_KEY).sort(
      (a, b) => b.startedAt - a.startedAt
    );
  }
}

export async function addSessionHistory(record: SessionHistoryRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      tx.objectStore(SESSIONS_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = readFallback<SessionHistoryRecord>(FALLBACK_SESSIONS_KEY);
    writeFallback(FALLBACK_SESSIONS_KEY, [record, ...existing.filter((r) => r.id !== record.id)]);
  }
}

export async function deleteSessionHistoryRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      tx.objectStore(SESSIONS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = readFallback<SessionHistoryRecord>(FALLBACK_SESSIONS_KEY);
    writeFallback(
      FALLBACK_SESSIONS_KEY,
      existing.filter((r) => r.id !== id)
    );
  }
}

export async function clearAllSessionHistory(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      tx.objectStore(SESSIONS_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(FALLBACK_SESSIONS_KEY, []);
  }
}

export async function listPresets(): Promise<SessionPreset[]> {
  try {
    const db = await openDB();
    const existing = await new Promise<SessionPreset[]>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readonly');
      const req = tx.objectStore(PRESETS_STORE).getAll();
      req.onsuccess = () => resolve(req.result as SessionPreset[]);
      req.onerror = () => reject(req.error);
    });

    if (existing.length === 0 && !isPresetsSeeded()) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PRESETS_STORE, 'readwrite');
        const store = tx.objectStore(PRESETS_STORE);
        for (const preset of DEFAULT_STARTER_PRESETS) {
          store.put(preset);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      markPresetsSeeded(true);
      return [...DEFAULT_STARTER_PRESETS].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (!isPresetsSeeded() && existing.length > 0) {
      markPresetsSeeded(true);
    }

    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    let existing = readFallback<SessionPreset>(FALLBACK_PRESETS_KEY);
    if (existing.length === 0 && !isPresetsSeeded()) {
      existing = [...DEFAULT_STARTER_PRESETS];
      writeFallback(FALLBACK_PRESETS_KEY, existing);
      markPresetsSeeded(true);
    }
    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function savePreset(preset: SessionPreset): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readwrite');
      tx.objectStore(PRESETS_STORE).put(preset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = readFallback<SessionPreset>(FALLBACK_PRESETS_KEY);
    writeFallback(FALLBACK_PRESETS_KEY, [preset, ...existing.filter((p) => p.id !== preset.id)]);
  }
}

export async function deletePreset(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readwrite');
      tx.objectStore(PRESETS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = readFallback<SessionPreset>(FALLBACK_PRESETS_KEY);
    writeFallback(
      FALLBACK_PRESETS_KEY,
      existing.filter((p) => p.id !== id)
    );
  }
}

export async function resetAllDatabaseData(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, PRESETS_STORE], 'readwrite');
      tx.objectStore(SESSIONS_STORE).clear();
      tx.objectStore(PRESETS_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(FALLBACK_SESSIONS_KEY, []);
    writeFallback(FALLBACK_PRESETS_KEY, []);
  }
}
