import { ApprovalCategory, ApprovalItem, AuditActionInput } from '../types/index.js';
export declare class ApprovalService {
    /**
     * Managerial: List pending approval queue across Clock Repair, Overtime, Task Finish, etc.
     */
    listPendingApprovals(category?: ApprovalCategory): Promise<ApprovalItem[]>;
    /**
     * Execute single audit action (APPROVE or REJECT)
     */
    auditAction(input: AuditActionInput): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Batch audit compliant applications
     */
    batchAudit(approvalIds: string[], action?: 'APPROVE', defaultComment?: string): Promise<{
        success: boolean;
        processedCount: number;
        results: Array<{
            id: string;
            success: boolean;
        }>;
    }>;
}
export declare const approvalService: ApprovalService;
