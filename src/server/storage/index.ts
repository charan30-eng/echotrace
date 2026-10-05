/**
 * EchoTrace Phase 12: Storage Factory & Storage Strategy Selector
 */

import { InvestigationStorageAdapter } from './investigationStorage.ts';
import { FileInvestigationStorage } from './fileStorage.ts';
import { MemoryInvestigationStorage } from './memoryStorage.ts';

let activeStorage: InvestigationStorageAdapter | null = null;

export function getInvestigationStorage(): InvestigationStorageAdapter {
  if (activeStorage) {
    return activeStorage;
  }

  const storageType = process.env.INVESTIGATION_STORAGE_TYPE || 'file';

  if (storageType === 'memory' || process.env.NODE_ENV === 'test') {
    activeStorage = new MemoryInvestigationStorage();
  } else {
    // Default to persistent File Storage in .data/investigations.json
    activeStorage = new FileInvestigationStorage();
  }

  return activeStorage;
}

export function setInvestigationStorage(adapter: InvestigationStorageAdapter): void {
  activeStorage = adapter;
}

export * from './investigationStorage.ts';
export * from './fileStorage.ts';
export * from './memoryStorage.ts';
