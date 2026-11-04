export interface GitCommitItem {
    repoName: string;
    hash: string;
    author: string;
    date: string;
    summary: string;
}
export interface DailyWorkSummary {
    date: string;
    totalCommits: number;
    repos: string[];
    commits: GitCommitItem[];
    suggestedDescription: string;
}
export declare class GitService {
    /**
     * Scan git commits across configured or specified repositories for a given date
     */
    getDailyCommits(dateStr?: string, customRepos?: Array<{
        name: string;
        path: string;
    }>): Promise<DailyWorkSummary>;
}
export declare const gitService: GitService;
