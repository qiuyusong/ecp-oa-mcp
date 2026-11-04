import { ApprovalCategory, ApprovalItem, AuditActionInput } from '../types/index.js';
export declare class ApprovalService {
    listPendingApprovals(_category?: ApprovalCategory): Promise<ApprovalItem[]>;
    auditAction(input: AuditActionInput): Promise<{
        success: boolean;
        message: string;
    }>;
    batchAudit(approvalIds: string[], _action?: 'APPROVE', _defaultComment?: string): Promise<{
        success: boolean;
        processedCount: number;
        results: Array<{
            id: string;
            success: boolean;
        }>;
    }>;
}
export declare const approvalService: ApprovalService;
