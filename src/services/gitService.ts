import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/env.js';

const execAsync = promisify(exec);

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

export class GitService {
  /**
   * Scan git commits across configured or specified repositories for a given date
   */
  public async getDailyCommits(
    dateStr?: string,
    customRepos?: Array<{ name: string; path: string }>
  ): Promise<DailyWorkSummary> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const since = `${targetDate} 00:00:00`;
    const until = `${targetDate} 23:59:59`;

    const repoList = customRepos && customRepos.length > 0 ? customRepos : config.git.projects;
    const allCommits: GitCommitItem[] = [];

    for (const repo of repoList) {
      try {
        const cmd = `git -C "${repo.path}" log --since="${since}" --until="${until}" --pretty=format:"%h|%an|%ad|%s" --date=iso`;
        const { stdout } = await execAsync(cmd);
        if (!stdout || !stdout.trim()) continue;

        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const [hash, author, date, ...summaryParts] = line.split('|');
          if (hash && summaryParts.length > 0) {
            allCommits.push({
              repoName: repo.name,
              hash: hash.trim(),
              author: author?.trim() || '',
              date: date?.trim() || '',
              summary: summaryParts.join('|').trim(),
            });
          }
        }
      } catch (err: any) {
        console.warn(`[GitService] Warning scanning repo ${repo.name} (${repo.path}): ${err.message}`);
      }
    }

    const uniqueRepos = Array.from(new Set(allCommits.map((c) => c.repoName)));
    const summaries = allCommits.map((c) => `[${c.repoName}] ${c.summary}`);
    const suggestedDescription =
      summaries.length > 0
        ? summaries.slice(0, 5).join('; ') + (summaries.length > 5 ? ` 等共 ${summaries.length} 项提交` : '')
        : '日常系统优化与功能开发联调';

    return {
      date: targetDate,
      totalCommits: allCommits.length,
      repos: uniqueRepos,
      commits: allCommits,
      suggestedDescription,
    };
  }
}

export const gitService = new GitService();
