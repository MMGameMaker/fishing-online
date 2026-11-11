// Kiểu dữ liệu theo Admin API của Server (server/FishingOnline.Api/Modules/Admin).

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface AdminSession {
  accessToken: string;
  expiresAt: string;
  email: string;
  permissions: string[];
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ConfigVersion {
  version: string;
  isActive: boolean;
  publishedAt: string;
  publishedBy: string;
}

export interface Draft {
  draftId: string;
  baseVersion: string;
  revision: number;
  status: string;
  publishedVersion: string | null;
  updatedBy: string;
  updatedAt: string;
  document: JsonObject;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
}

export interface PlayerSummary {
  playerId: string;
  displayName: string;
  level: number;
  createdAt: string;
}

export interface PlayerDetail {
  playerId: string;
  displayName: string;
  level: number;
  exp: number;
  selectedSkinId: string;
  equippedRodId: string;
  gold: string;
  ledgerTotal: string;
  rods: string[];
  openSignals: number;
}

export interface Signal {
  signalId: string;
  ruleCode: string;
  ruleVersion: string;
  severity: string;
  windowStart: string;
  windowEnd: string;
  sampleCount: number;
  observedValue: number;
  threshold: number;
  representativeAttemptIds: string[];
  lastSeenAt: string;
  occurrences: number;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
}

/** Từ khi đổi sang vé câu theo thời gian, ghế không còn Tier hay giá riêng. */
export interface SeatView {
  seatId: string;
  state: string;
  occupantPlayerId: string | null;
}

export interface PlayerView {
  playerId: string;
  displayName: string;
  seatId: string | null;
  fishing: boolean;
}

export interface PopulationView {
  speciesId: string;
  remaining: number;
  reserved: number;
  available: number;
  stocked: number;
  caught: number;
}

export interface LakeView {
  lakeId: string;
  seats: SeatView[];
  onlinePlayers: PlayerView[];
  population: PopulationView[];
}

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  target: string;
  beforeJson: string | null;
  afterJson: string | null;
  at: string;
}

export interface StockingLine {
  speciesId: string;
  quantity: number;
}

export interface StockingBatch {
  batchId: string;
  lakeId: string;
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled' | 'failed';
  scheduledAt: string | null;
  timeZone: string | null;
  note: string | null;
  lines: StockingLine[];
  speciesCount: number;
  totalFish: number;
  revision: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  executedAt: string | null;
  executedBy: string | null;
  error: string | null;
}

export interface CatalogFish {
  speciesId: string;
  name: string;
  rarity: string;
}
