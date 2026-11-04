function unsupported(operation) {
    throw new Error(`AIPower source has no generic workflow approval Action for ${operation}; no approval request was sent.`);
}
export class ApprovalService {
    async listPendingApprovals(_category) {
        return unsupported('pending approval list');
    }
    async auditAction(input) {
        return unsupported(`audit action on ${input.approvalId}`);
    }
    async batchAudit(approvalIds, _action = 'APPROVE', _defaultComment) {
        return unsupported(`batch audit for ${approvalIds.length} items`);
    }
}
export const approvalService = new ApprovalService();
//# sourceMappingURL=approvalService.js.map