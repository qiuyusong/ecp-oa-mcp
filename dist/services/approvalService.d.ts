import { ApprovalCategory, ApprovalItem, AuditActionInput } from '../types/index.js';
export declare class ApprovalService {
    /**
     * List pending approvals / work items for the current user
     */
    listPendingApprovals(category?: ApprovalCategory): Promise<ApprovalItem[]>;
    /**
     * Execute single approval or rejection
     */
    auditAction(input: AuditActionInput): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Batch approve / reject pending work items
     */
    batchAudit(approvalIds: string[], action?: 'APPROVE' | 'REJECT', defaultComment?: string): Promise<{
        success: boolean;
        processedCount: number;
        results: Array<{
            id: string;
            success: boolean;
            message?: string;
        }>;
    }>;
}
export declare const approvalService: ApprovalService;
