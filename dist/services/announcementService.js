import { ecpClient } from '../clients/ecpClient.js';
export class AnnouncementService {
    /**
     * List announcements (read & unread)
     */
    async listAnnouncements() {
        let records = [];
        try {
            const res = await ecpClient.postAction('Ecp.Proclamation.getListData');
            records = res?.data?.records || [];
        }
        catch (err) {
            console.warn('[AnnouncementService] Failed to query proclamation list:', err.message);
            return [];
        }
        return records.map((r) => ({
            id: r.FId || r.id,
            title: r.FName || r.title || '企业公告',
            content: r.FContent || r.content,
            publishUser: r['FUserId$'] || r['FCreateUserId$'] || '管理员',
            publishTime: r.FPublishDate?.slice?.(0, 19) || r.FCreateTime?.slice?.(0, 19) || '',
            isRead: Boolean(r.FIsRead),
            isPinned: Boolean(r.FIsTop),
        }));
    }
    /**
     * Publish a new team / company announcement
     */
    async publishAnnouncement(title, content) {
        const userId = await ecpClient.getUserId();
        const res = await ecpClient.postAction('Ecp.Proclamation.save', {
            data: {
                FName: title,
                FContent: content,
                FUserId: userId,
                FPublishDate: new Date().toISOString(),
            },
        });
        const id = res?.entityId || res?.id || res?.data?.entityId || '';
        return {
            success: true,
            id,
            message: `公告「${title}」已成功发布。`,
        };
    }
}
export const announcementService = new AnnouncementService();
//# sourceMappingURL=announcementService.js.map