import { AnnouncementItem } from '../types/index.js';
export declare class AnnouncementService {
    /**
     * List announcements (read & unread)
     */
    listAnnouncements(): Promise<AnnouncementItem[]>;
    /**
     * Publish a new team / company announcement
     */
    publishAnnouncement(title: string, content: string): Promise<{
        success: boolean;
        id: string;
        message: string;
    }>;
}
export declare const announcementService: AnnouncementService;
