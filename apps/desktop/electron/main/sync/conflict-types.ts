export type ConflictStatus =
  | 'DETECTED'
  | 'CLASSIFIED'
  | 'PENDING_RESOLUTION'
  | 'RESOLVED'
  | 'REJECTED';

export type ConflictCategory =
  | 'CONCURRENT_UPDATE'
  | 'STALE_VERSION'
  | 'DUPLICATE_EVENT'
  | 'OUT_OF_ORDER_EVENT'
  | 'MASTER_DATA_CONFLICT'
  | 'INVENTORY_CONFLICT'
  | 'FINANCIAL_CONFLICT'
  | 'DELETE_VS_UPDATE';

export type ResolutionStrategy =
  | 'AUTO_LATEST_TIMESTAMP'
  | 'AUTO_KEEP_LOCAL'
  | 'AUTO_KEEP_REMOTE'
  | 'AUTO_MERGE_SAFE'
  | 'MANUAL_USER_DECISION'
  | 'REJECT_DUPLICATE'
  | 'REJECT_INVALID';

export type EntityType =
  | 'product'
  | 'category'
  | 'supplier'
  | 'customer'
  | 'transaction'
  | 'stock_movement'
  | 'payment'
  | 'sales_return'
  | 'stock_adjustment'
  | 'purchase_order'
  | 'goods_receiving';

export interface ConflictRecord {
  conflictId: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  localVersion: number | null;
  remoteVersion: number | null;
  localDeviceId: string;
  remoteDeviceId: string;
  conflictCategory: ConflictCategory;
  status: ConflictStatus;
  detectionTimestamp: string;
  classifiedAt: string | null;
  pendingResolutionAt: string | null;
  resolvedAt: string | null;
  rejectedAt: string | null;
  resolutionStrategy: ResolutionStrategy | null;
  resolutionUserId: string | null;
  resolutionReason: string | null;
  localStateSnapshot: string;
  remoteStateSnapshot: string;
  auditMetadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictResolutionHistoryRecord {
  historyId: string;
  conflictId: string;
  previousStatus: ConflictStatus;
  newStatus: ConflictStatus;
  actionTaken: string;
  userId: string | null;
  deviceId: string | null;
  timestamp: string;
  metadata: string | null;
}

export interface EntityVersionRecord {
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  currentVersion: number;
  lastModifiedAt: string;
  lastModifiedDeviceId: string;
  createdAt: string;
}

export interface DetectedConflict {
  entityType: EntityType;
  entityId: string;
  localDeviceId: string;
  remoteDeviceId: string;
  conflictCategory: ConflictCategory;
  localState: unknown;
  remoteState: unknown;
  localVersion: number | null;
  remoteVersion: number | null;
}

export interface ClassificationResult {
  canAutoResolve: boolean;
  recommendedStrategy: ResolutionStrategy | null;
  confidence: number;
  requiresUserInput: boolean;
  classificationReason: string;
}

export const SAFE_AUTO_RESOLVE_CATEGORIES: ConflictCategory[] = [
  'DUPLICATE_EVENT',
  'OUT_OF_ORDER_EVENT',
];

export const FINANCIAL_ENTITY_TYPES: EntityType[] = [
  'transaction',
  'payment',
  'sales_return',
];

export const INVENTORY_ENTITY_TYPES: EntityType[] = [
  'stock_movement',
  'stock_adjustment',
  'goods_receiving',
];

export const MASTER_DATA_ENTITY_TYPES: EntityType[] = [
  'product',
  'category',
  'supplier',
  'customer',
];