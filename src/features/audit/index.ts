/**
 * Audit feature barrel. NOTE: data-layer modules (e.g. DashboardData) import
 * from the source files directly, not this barrel, to avoid Metro's lazy-bundle
 * "Requiring unknown module" issue on re-export indexes.
 */
export { AuditRepo, createAuditRepo } from './AuditRepo';
export { useAuditLog, recordAudit, auditKeys } from './useAudit';
export type { AuditEvent, AuditEventType, AuditRow } from './audit.types';
