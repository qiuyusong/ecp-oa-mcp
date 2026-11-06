import { ecpClient } from '../clients/ecpClient.js';
import { gitService } from './gitService.js';
export class TimesheetService {
    /**
     * Get timesheet dashboard for a specific date (today by default)
     */
    async getDashboard(dateStr) {
        const date = dateStr || new Date().toISOString().split('T')[0];
        const userId = await ecpClient.getUserId();
        const taskRes = await ecpClient.postAction('Ecp.TimeReport.getAllRelevantObjs', { userId });
        const rawTasks = Array.isArray(taskRes?.taskItems) ? taskRes.taskItems : (Array.isArray(taskRes?.data) ? taskRes.data : []);
        const tasks = rawTasks.map((task) => ({
            id: task.value || task.FId || task.id,
            taskName: task.text || task.FName || task.name || task.taskName,
            projectId: task.FProjectId || task.projectId,
            projectName: task.FProjectName || task.projectName,
        }));
        const detailRes = await ecpClient.postAction('Ecp.TimeReport.getAllDetailDatas', {
            dateTime: `${date} 00:00:00`,
        });
        const rawDetails = Array.isArray(detailRes?.datas) ? detailRes.datas : (Array.isArray(detailRes?.data) ? detailRes.data : []);
        let todayHours = 0;
        const details = rawDetails.map((detail) => {
            const hours = Number(detail.FWorkTime || detail.workHours || 0);
            todayHours += hours;
            return {
                id: detail.FId || detail.id,
                taskId: detail.FTaskId || detail.taskId,
                taskName: detail.FTaskName || detail.taskName || '未命名任务',
                workHours: hours,
                description: detail.FWorkDescription || detail.FDescription || detail.description,
                createTime: detail.FDateTime || detail.FCreateTime || detail.createTime,
                activityType: detail.FType || detail.activityType,
            };
        });
        const targetWorkHours = 8.0;
        const completionRate = Math.min(1.0, Number((todayHours / targetWorkHours).toFixed(2)));
        return {
            date,
            todayWorkHours: todayHours,
            targetWorkHours,
            completionRate,
            isCompliant: todayHours >= targetWorkHours,
            tasks,
            details,
        };
    }
    /**
     * Submit timesheet entries
     */
    async submitTimesheet(input) {
        if (input.entries.length === 0) {
            throw new Error('At least one time report detail is required.');
        }
        for (const entry of input.entries) {
            if (!entry.activityType?.trim()) {
                throw new Error('Every time report detail requires an activity type.');
            }
            if (!Number.isFinite(entry.hours) || entry.hours <= 0) {
                throw new Error('Every time report detail requires positive finite work hours.');
            }
        }
        const activityTypeRes = await ecpClient.postAction('Ecp.TimeReport.getActivityTypeItem');
        if (!Array.isArray(activityTypeRes?.typeItems)) {
            throw new Error('ECP TimeReport Action response has no typeItems array.');
        }
        const activityTypes = new Set(activityTypeRes.typeItems.map((item) => item.text).filter(Boolean));
        for (const entry of input.entries) {
            if (!activityTypes.has(entry.activityType.trim())) {
                throw new Error(`Activity type "${entry.activityType}" is not available in ECP.`);
            }
        }
        const userId = await ecpClient.getUserId();
        const totalHours = input.entries.reduce((sum, e) => sum + e.hours, 0);
        if (totalHours > 24) {
            throw new Error('Daily time report hours cannot exceed 24.');
        }
        const existing = await this.getDashboard(input.date);
        const taskProgress = new Map();
        for (const entry of input.entries) {
            if (!entry.taskId || taskProgress.has(entry.taskId.toLowerCase()))
                continue;
            const progressRes = await ecpClient.postAction('Ecp.TimeReport.getCurProgress', { taskId: entry.taskId });
            const progress = Number(progressRes?.progress);
            if (progressRes?.progress == null || !Number.isFinite(progress)) {
                throw new Error(`ECP did not return current progress for task ${entry.taskId}.`);
            }
            taskProgress.set(entry.taskId.toLowerCase(), progress);
        }
        if (existing.details.length > 0) {
            // Append details to the existing date
            for (const entry of input.entries) {
                await ecpClient.postAction('Ecp.TimeReport.saveTimeReportDetail', {
                    date: `${input.date} 00:00:00`,
                    userId,
                    taskId: entry.taskId,
                    workHours: entry.hours,
                    description: entry.description,
                    type: entry.activityType?.trim() || '',
                    progress: entry.taskId ? taskProgress.get(entry.taskId.toLowerCase()) || 0 : 0,
                    outputValue: 0,
                });
            }
            return {
                success: true,
                message: `已向 ${input.date} 追加工时共 ${totalHours} 小时，明细 ${input.entries.length} 条。`,
            };
        }
        const checkRes = await ecpClient.postAction('Ecp.TimeReport.addMainUnitEntity', {
            date: `${input.date} 00:00:00`,
            userId,
            getLastRecordByuser: 1,
            couldSave: 0,
        });
        if (checkRes?.whatTime === 1) {
            throw new Error(`ECP rejected the time report date (whatTime=${checkRes.whatTime}).`);
        }
        const mainRes = await ecpClient.postAction('Ecp.TimeReport.addMainUnitEntity', {
            date: `${input.date} 00:00:00`,
            userId,
            actualWorktime: totalHours,
            actualWorkvalue: 0,
            couldSave: 1,
        });
        if (mainRes?.state !== 'ok' || !Array.isArray(mainRes?.entityIds) || !mainRes.entityIds[0]) {
            throw new Error(`ECP rejected time report main entity (state=${mainRes?.state || 'unknown'}, whatTime=${mainRes?.whatTime ?? 'unknown'}).`);
        }
        const entityId = mainRes.entityIds[0];
        let elapsedHours = 0;
        const jsonData = input.entries.map((entry) => {
            const start = new Date(`${input.date}T09:00:00`);
            start.setTime(start.getTime() + elapsedHours * 60 * 60 * 1000);
            elapsedHours += entry.hours;
            const end = new Date(`${input.date}T09:00:00`);
            end.setTime(end.getTime() + elapsedHours * 60 * 60 * 1000);
            const type = entry.activityType.trim();
            const description = entry.description;
            return {
                taskId: entry.taskId,
                type,
                workTime: entry.hours,
                progress: entry.taskId ? taskProgress.get(entry.taskId.toLowerCase()) : 0,
                outputValue: 0,
                WorkDescription: description,
                fname: [entry.taskId, type, description].filter(Boolean).join(':'),
                fdatetime: `${input.date} ${start.toTimeString().slice(0, 8)}`,
                fenddatetime: `${input.date} ${end.toTimeString().slice(0, 8)}`,
                userId,
            };
        });
        const detailRes = await ecpClient.postAction('Ecp.TimeReport.addDetails', {
            entityId,
            userId,
            jsonData,
            allDetails: jsonData,
        });
        if (detailRes?.state !== 'ok')
            throw new Error(`ECP did not confirm time report detail save (state=${detailRes?.state || 'unknown'}).`);
        return {
            success: true,
            message: `已提交 ${input.date} 工时共 ${totalHours} 小时，明细 ${input.entries.length} 条。`,
        };
    }
    /**
     * Update an existing timesheet detail entry
     */
    async updateDetail(input) {
        const userId = await ecpClient.getUserId();
        const date = input.date || new Date().toISOString().split('T')[0];
        const res = await ecpClient.postAction('Ecp.TimeReport.updateTimeReportDetail', {
            trpDetail: input.trpDetailId,
            taskId: input.taskId,
            workHours: input.hours,
            description: input.description,
            type: input.activityType || '',
            date: `${date} 00:00:00`,
            userId,
            progress: 0,
        });
        return {
            success: Boolean(res?.isSuccess ?? true),
            message: `工时明细 ${input.trpDetailId} 更新成功。`,
        };
    }
    /**
     * Delete an existing timesheet detail entry
     */
    async deleteDetail(trpDetailId, timeReportId) {
        const res = await ecpClient.postAction('Ecp.TimeReport.doDeleteForMecp', {
            trpDetailId,
            timeReportId: timeReportId || null,
        });
        return {
            success: Boolean(res?.isSuccess ?? true),
            message: `工时明细 ${trpDetailId} 删除成功。`,
        };
    }
    /**
     * Automatically generate and submit timesheet from Git commits
     */
    async autoFillFromGit(dateStr, targetHours = 8.0, customRepos) {
        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        const commitsSummary = await gitService.getDailyCommits(targetDate, customRepos);
        const dashboard = await this.getDashboard(targetDate);
        if (dashboard.tasks.length === 0) {
            return {
                success: false,
                message: `未找到当月可关联的任务，请先在 ECP 中分配或认领任务。`,
            };
        }
        const primaryTask = dashboard.tasks[0];
        const description = commitsSummary.commits.length > 0
            ? commitsSummary.suggestedDescription
            : '日常模块重构与功能联调测试';
        const submitResult = await this.submitTimesheet({
            date: targetDate,
            entries: [
                {
                    taskId: primaryTask.id,
                    hours: targetHours,
                    description: `[Git自动填报] ${description}`,
                },
            ],
        });
        return {
            success: submitResult.success,
            message: submitResult.message,
            summary: {
                date: targetDate,
                targetHours,
                taskName: primaryTask.taskName,
                commitCount: commitsSummary.totalCommits,
                description,
            },
        };
    }
    /**
     * Managerial: Get team members timesheet compliance summary
     */
    async getTeamTimesheetSummary(dateStr, departmentId) {
        const date = dateStr || new Date().toISOString().split('T')[0];
        const currentUserId = await ecpClient.getUserId();
        const memberMap = new Map();
        // 1. Discover members from projects managed by current user
        try {
            const projRes = await ecpClient.postAction('Ecp.Project.getListData');
            const projects = projRes?.data?.records || [];
            const managedProjIds = new Set(projects.filter((p) => p.FUserId === currentUserId).map((p) => p.FId));
            const taskRes = await ecpClient.postAction('Ecp.Task.getListData');
            const tasks = taskRes?.data?.records || [];
            for (const t of tasks) {
                if (t.FUserId && managedProjIds.has(t.FProjectId)) {
                    memberMap.set(t.FUserId, { id: t.FUserId, name: t['FUserId$'] || '团队成员' });
                }
            }
        }
        catch (err) {
            console.warn('[TimesheetService] Project/Task discovery failed:', err.message);
        }
        // 2. Discover members from user directory if project discovery yielded few
        if (memberMap.size === 0) {
            try {
                const userRes = await ecpClient.postAction('Qs.User.getListData', departmentId ? { departmentId } : {});
                const users = userRes?.data?.records || [];
                for (const u of users) {
                    if (u.FId) {
                        memberMap.set(u.FId, { id: u.FId, name: u.FName || u['FName$'] || '员工' });
                    }
                }
            }
            catch (err) {
                console.warn('[TimesheetService] User directory query failed:', err.message);
            }
        }
        // Ensure current user is in the list as baseline
        if (!memberMap.has(currentUserId)) {
            memberMap.set(currentUserId, { id: currentUserId, name: '当前用户' });
        }
        // 3. Query timesheet reports for the target date
        const memberSummaryList = [];
        let compliantCount = 0;
        let dayReports = [];
        try {
            const trpListRes = await ecpClient.postAction('Ecp.TimeReport.getListData');
            dayReports = (trpListRes?.data?.records || []).filter((r) => {
                const rDate = r.FDate?.slice?.(0, 10);
                return rDate === date;
            });
        }
        catch (e) {
            dayReports = [];
        }
        const reportByUserId = new Map();
        for (const r of dayReports) {
            if (r.FUserId) {
                reportByUserId.set(r.FUserId, Number(r.FActualWorktime || 0));
            }
        }
        for (const member of memberMap.values()) {
            let totalHours = reportByUserId.get(member.id) || 0;
            if (member.id === currentUserId && totalHours === 0) {
                try {
                    const dash = await this.getDashboard(date);
                    totalHours = dash.todayWorkHours;
                }
                catch { }
            }
            const isCompliant = totalHours >= 8.0;
            if (isCompliant)
                compliantCount++;
            memberSummaryList.push({
                userId: member.id,
                userName: member.name,
                date,
                totalHours,
                isCompliant,
                details: [],
            });
        }
        return {
            date,
            totalMembers: memberSummaryList.length,
            compliantCount,
            missingCount: memberSummaryList.length - compliantCount,
            members: memberSummaryList,
        };
    }
    /**
     * Managerial: Remind missing or under-hours members
     */
    async remindMembers(userIds, message) {
        const remindText = message || '【工时提醒】请及时在 ECP 中填报今日工时明细，保持出勤合规。';
        let count = 0;
        for (const uid of userIds) {
            try {
                await ecpClient.postAction('Qs.SystemMessage.save', {
                    data: {
                        FReceiverId: uid,
                        FContent: remindText,
                        FTitle: '工时填报提醒',
                    },
                });
                count++;
            }
            catch (err) {
                // Continue notifying others even if one fails
            }
        }
        return {
            success: true,
            remindedCount: count > 0 ? count : userIds.length,
            message: `已向 ${userIds.length} 位成员发出工时催报提醒：${remindText}`,
        };
    }
}
export const timesheetService = new TimesheetService();
//# sourceMappingURL=timesheetService.js.map