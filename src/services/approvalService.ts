import { ApprovalCategory, ApprovalItem, AuditActionInput } from '../types/index.js';

function unsupported(operation: string): never {
  throw new Error(`AIPower source has no generic workflow approval Action for ${operation}; no approval request was sent.`);
}

export class ApprovalService {
  public async listPendingApprovals(_category?: ApprovalCategory): Promise<ApprovalItem[]> {
    return unsupported('pending approval list');
  }

  public async auditAction(input: AuditActionInput): Promise<{ success: boolean; message: string }> {
    return unsupported(`audit action on ${input.approvalId}`);
  }

  public async batchAudit(approvalIds: string[], _action: 'APPROVE' = 'APPROVE', _defaultComment?: string): Promise<{
    success: boolean;
    processedCount: number;
    results: Array<{ id: string; success: boolean }>;
  }> {
    return unsupported(`batch audit for ${approvalIds.length} items`);
  }
}

export const approvalService = new ApprovalService();
