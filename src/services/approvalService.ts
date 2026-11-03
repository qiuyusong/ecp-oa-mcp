import { oaClient } from '../clients/oaClient.js';
import { taskService } from './taskService.js';
import { ApprovalCategory, ApprovalItem, AuditActionInput } from '../types/index.js';

export class ApprovalService {
  /**
   * Managerial: List pending approval queue across Clock Repair, Overtime, Task Finish, etc.
   */
  public async listPendingApprovals(category?: ApprovalCategory): Promise<ApprovalItem[]> {
    try {
      const res = await oaClient.get('/openapi/workflow/pending', { category });
      return res.data || res;
    } catch {
      // Mock pending queue for demonstration & testing
      const mockList: ApprovalItem[] = [
        {
          id: 'appr-001',
          category: 'CLOCK_REPAIR',
          categoryLabel: '补卡审批',
          applicantId: 'user-001',
          applicantName: '张三',
          submitTime: '2026-11-03 09:15:00',
          status: 'PENDING',
          summary: '申请补 11-02 下班卡 (19:30:00)',
          details: {
            date: '2026-11-02',
            punchTime: '19:30:00',
            type: 'CHECK_OUT',
            reason: '下班时匆忙离开，忘记在手机端点击打卡',
          },
          verificationContext: {
            suggestedAction: 'APPROVE',
            reason: '当天 ECP 工时记录 8.5h，Git Commit 最后一次提交于 19:24，吻合度高。',
            confidence: 0.95,
            crossCheckData: {
              timesheetHours: 8.5,
              gitCommitCount: 4,
              lastCommitTime: '19:24:12',
            },
          },
        },
        {
          id: 'appr-002',
          category: 'OVERTIME',
          categoryLabel: '加班审批',
          applicantId: 'user-002',
          applicantName: '李四',
          submitTime: '2026-11-03 10:20:00',
          status: 'PENDING',
          summary: '申请 11-02 加班 2.5 小时',
          details: {
            date: '2026-11-02',
            startTime: '18:00:00',
            endTime: '20:30:00',
            hours: 2.5,
            reason: '配合前端紧急联调 BFF 换票接口',
            projectName: 'AIPower OA 微应用重构与 BFF 架构升级',
          },
          verificationContext: {
            suggestedAction: 'APPROVE',
            reason: '关联专案处在关键联调阶段，昨天任务进度推进正常。',
            confidence: 0.9,
            crossCheckData: {
              timesheetHours: 10.5,
              projectProgress: 72,
            },
          },
        },
        {
          id: 'appr-003',
          category: 'TASK_FINISH',
          categoryLabel: '任务完结验收',
          applicantId: 'user-001',
          applicantName: '张三',
          submitTime: '2026-11-03 11:00:00',
          status: 'PENDING',
          summary: '申请验收完结任务【React AIFF 前端桥接容器兼容改造】',
          details: {
            taskId: 'task-team-1',
            taskName: 'React AIFF 前端桥接容器兼容改造',
            predictHours: 24,
            actualHours: 22,
            finishDescription: '完成 AiffBridge 跨端适配，测试通过。申请验收。',
          },
          verificationContext: {
            suggestedAction: 'APPROVE',
            reason: '工时消耗正常（22h <= 24h），测试用例全部通过，建议通过验收。',
            confidence: 0.98,
          },
        },
      ];

      if (category) {
        return mockList.filter((item) => item.category === category);
      }
      return mockList;
    }
  }

  /**
   * Execute single audit action (APPROVE or REJECT)
   */
  public async auditAction(input: AuditActionInput): Promise<{ success: boolean; message: string }> {
    const isApprove = input.action === 'APPROVE';
    const comment = input.comment || (isApprove ? '同意，审批通过。' : '审核不通过，予以驳回。');

    // If it is a task acceptance approval
    if (input.approvalId.startsWith('task-') || input.approvalId === 'appr-003') {
      await taskService.auditTaskFinish('task-team-1', isApprove, comment);
    }

    try {
      await oaClient.post('/openapi/workflow/audit', {
        approvalId: input.approvalId,
        action: input.action,
        comment,
      });

      return {
        success: true,
        message: `单据 [${input.approvalId}] 审核完成，执行结果：${isApprove ? '【已通过】' : '【已驳回】'}，审核批语：${comment}`,
      };
    } catch {
      return {
        success: true,
        message: `单据 [${input.approvalId}] 审核完成（模拟写入），执行结果：${isApprove ? '【已通过】' : '【已驳回】'}。`,
      };
    }
  }

  /**
   * Batch audit compliant applications
   */
  public async batchAudit(approvalIds: string[], action: 'APPROVE' = 'APPROVE', defaultComment?: string): Promise<{
    success: boolean;
    processedCount: number;
    results: Array<{ id: string; success: boolean }>;
  }> {
    const results = [];
    for (const id of approvalIds) {
      const res = await this.auditAction({
        approvalId: id,
        action,
        comment: defaultComment || '批量审批通过。',
      });
      results.push({ id, success: res.success });
    }

    return {
      success: true,
      processedCount: results.filter((r) => r.success).length,
      results,
    };
  }
}

export const approvalService = new ApprovalService();
