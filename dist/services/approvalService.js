import { ecpClient } from '../clients/ecpClient.js';
export class ApprovalService {
    /**
     * List pending approvals / work items for the current user
     */
    async listPendingApprovals(category) {
        let rawItems = [];
        try {
            const res = await ecpClient.postAction('Wf.WorkItem.getHomepageTodoListData');
            rawItems = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.records) ? res.records : []);
        }
        catch (err) {
            // Fallback to Wf.WorkItem.getListData if getHomepageTodoListData is not available
            try {
                const listRes = await ecpClient.postAction('Wf.WorkItem.getListData');
                rawItems = listRes?.data?.records || [];
            }
            catch (listErr) {
                console.warn('[ApprovalService] Failed to query WorkItem list:', err.message);
                return [];
            }
        }
        const items = rawItems.map((r) => {
            const title = r.FName || r.name || r.title || '待办工作项';
            let derivedCategory = 'GENERAL_WORKITEM';
            if (/任务|task/i.test(title) || /task/i.test(r.FProcessId$ || '')) {
                derivedCategory = 'TASK_FINISH';
            }
            else if (/补卡|clock/i.test(title)) {
                derivedCategory = 'CLOCK_REPAIR';
            }
            else if (/加班|overtime/i.test(title)) {
                derivedCategory = 'OVERTIME';
            }
            else if (/请假|leave/i.test(title)) {
                derivedCategory = 'LEAVE';
            }
            else if (/延期|delay/i.test(title)) {
                derivedCategory = 'PROJECT_DELAY';
            }
            return {
                id: r.FId || r.id,
                category: derivedCategory,
                categoryLabel: derivedCategory === 'TASK_FINISH' ? '任务完结验收' :
                    derivedCategory === 'PROJECT_DELAY' ? '专案延期审批' :
                        derivedCategory === 'CLOCK_REPAIR' ? '补卡审批' :
                            derivedCategory === 'OVERTIME' ? '加班审批' :
                                derivedCategory === 'LEAVE' ? '请假审批' : '通用流程审批',
                applicantId: r.FSubmitUserId || r.FCreateUserId || '',
                applicantName: r['FSubmitUserId$'] || r['FCreateUserId$'] || r.FSubmitUserName || '申请人',
                submitTime: r.FStartTime?.slice?.(0, 19) || r.FCreateTime?.slice?.(0, 19) || '',
                status: 'PENDING',
                summary: title,
                details: {
                    processId: r.FProcessId,
                    processName: r['FProcessId$'] || r.FProcessName,
                    nodeName: r['FNodeId$'] || r.FNodeName,
                    masterEntityId: r.FMasterEntityId || r.FEntityId,
                },
            };
        });
        if (category) {
            return items.filter((item) => item.category === category);
        }
        return items;
    }
    /**
     * Execute single approval or rejection
     */
    async auditAction(input) {
        const result = input.action === 'APPROVE' ? 'pass' : 'reject';
        const comment = input.comment || (input.action === 'APPROVE' ? '审核通过' : '驳回修改');
        await ecpClient.postAction('Wf.WorkItem.finish', {
            workItemId: input.approvalId,
            result,
            comment,
        });
        return {
            success: true,
            message: `工作项 ${input.approvalId} 已成功${input.action === 'APPROVE' ? '审批通过' : '驳回修改'}。`,
        };
    }
    /**
     * Batch approve / reject pending work items
     */
    async batchAudit(approvalIds, action = 'APPROVE', defaultComment) {
        if (approvalIds.length === 0) {
            return { success: true, processedCount: 0, results: [] };
        }
        const comment = defaultComment || (action === 'APPROVE' ? '经核实无误，批量审批通过。' : '批量审批驳回。');
        if (action === 'APPROVE') {
            try {
                await ecpClient.postAction('Wf.WorkItem.batchPass', {
                    workItemIds: approvalIds,
                    comment,
                });
                return {
                    success: true,
                    processedCount: approvalIds.length,
                    results: approvalIds.map((id) => ({ id, success: true })),
                };
            }
            catch (err) {
                // Fallback to one-by-one execution if batchPass encounters individual constraints
                const results = [];
                let successCount = 0;
                for (const id of approvalIds) {
                    try {
                        await this.auditAction({ approvalId: id, action: 'APPROVE', comment });
                        results.push({ id, success: true });
                        successCount++;
                    }
                    catch (e) {
                        results.push({ id, success: false, message: e.message });
                    }
                }
                return {
                    success: successCount > 0,
                    processedCount: successCount,
                    results,
                };
            }
        }
        else {
            const results = [];
            let successCount = 0;
            for (const id of approvalIds) {
                try {
                    await this.auditAction({ approvalId: id, action: 'REJECT', comment });
                    results.push({ id, success: true });
                    successCount++;
                }
                catch (e) {
                    results.push({ id, success: false, message: e.message });
                }
            }
            return {
                success: successCount > 0,
                processedCount: successCount,
                results,
            };
        }
    }
}
export const approvalService = new ApprovalService();
//# sourceMappingURL=approvalService.js.map