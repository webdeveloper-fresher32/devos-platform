import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

export interface GithubRepoInfo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
}

export interface GithubCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

export interface GithubPrInfo {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
}

export interface GithubIssueInfo {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  async fetchUserProfile(accessToken: string) {
    const octokit = new Octokit({ auth: accessToken });
    const response = await octokit.rest.users.getAuthenticated();
    return response.data;
  }

  async fetchUserOrgs(accessToken: string) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const response = await octokit.rest.orgs.listForAuthenticatedUser({
        per_page: 100,
      });
      return response.data;
    } catch (err) {
      this.logger.error('Failed to fetch user organizations from GitHub', err);
      return [];
    }
  }

  private getOctokit(pat?: string): Octokit | null {
    const token = pat || process.env.GITHUB_PAT;
    if (!token) {
      this.logger.warn('No GITHUB_PAT token provided, operating in Mock fallback mode.');
      return null;
    }
    return new Octokit({ auth: token });
  }

  async fetchUserRepos(pat?: string): Promise<GithubRepoInfo[]> {
    const octokit = this.getOctokit(pat);
    if (!octokit) {
      // Mock Data Fallback
      return [
        { id: 101, name: 'api-service', fullName: 'acme/api-service', owner: 'acme' },
        { id: 102, name: 'frontend-app', fullName: 'acme/frontend-app', owner: 'acme' },
        { id: 103, name: 'ml-pipeline', fullName: 'acme/ml-pipeline', owner: 'acme' },
      ];
    }

    try {
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });
      return response.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch repositories from GitHub REST API, falling back to mocks', error);
      return [
        { id: 101, name: 'api-service', fullName: 'acme/api-service', owner: 'acme' },
        { id: 102, name: 'frontend-app', fullName: 'acme/frontend-app', owner: 'acme' },
      ];
    }
  }

  async fetchCommits(owner: string, repo: string, pat?: string): Promise<GithubCommitInfo[]> {
    const octokit = this.getOctokit(pat);
    if (!octokit) {
      return [
        {
          sha: 'a1b2c3d4e5f6g7h8i9j0',
          message: 'feat: Add LocalStorage strategy provider',
          authorName: 'John Doe',
          authorEmail: 'john@acme.com',
          createdAt: new Date().toISOString(),
        },
        {
          sha: 'b2c3d4e5f6g7h8i9j0k1',
          message: 'fix: Resolve organization membership boundary query logs',
          authorName: 'Alice Smith',
          authorEmail: 'alice@acme.com',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }

    try {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 50,
      });
      return response.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        authorName: commit.commit.author?.name || commit.author?.login || 'Unknown',
        authorEmail: commit.commit.author?.email || '',
        createdAt: commit.commit.author?.date || new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch commits for ${owner}/${repo}, falling back`, error);
      return [];
    }
  }

  async fetchPullRequests(owner: string, repo: string, pat?: string): Promise<GithubPrInfo[]> {
    const octokit = this.getOctokit(pat);
    if (!octokit) {
      return [
        {
          id: 201,
          number: 14,
          title: 'feat: Scaffold NestJS core modules and configs',
          state: 'open',
          author: 'alice-coder',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 202,
          number: 12,
          title: 'refactor: Move database migrations to pgvector index',
          state: 'merged',
          author: 'john-dev',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
    }

    try {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 50,
      });
      return response.data.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
        author: pr.user?.login || 'Unknown',
        createdAt: pr.created_at,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch PRs for ${owner}/${repo}, falling back`, error);
      return [];
    }
  }

  async fetchIssues(owner: string, repo: string, pat?: string): Promise<GithubIssueInfo[]> {
    const octokit = this.getOctokit(pat);
    if (!octokit) {
      return [
        {
          id: 301,
          number: 5,
          title: 'Bug: Webhook signature checks throwing 401 on valid keys',
          state: 'open',
          createdAt: new Date(Date.now() - 43200000).toISOString(),
        },
        {
          id: 302,
          number: 2,
          title: 'Task: Establish RDS and IAM deployment profiles',
          state: 'closed',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];
    }

    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 50,
      });
      // Filter out Pull Requests as GitHub API treats PRs as issues in listForRepo
      return response.data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state as 'open' | 'closed',
          createdAt: issue.created_at,
        }));
    } catch (error) {
      this.logger.error(`Failed to fetch Issues for ${owner}/${repo}, falling back`, error);
      return [];
    }
  }

  async createWebhook(
    owner: string,
    repo: string,
    targetUrl: string,
    secret: string,
    pat?: string
  ): Promise<boolean> {
    const octokit = this.getOctokit(pat);
    if (!octokit) {
      this.logger.log(`Mock-creating webhook registration on ${owner}/${repo} pointing to ${targetUrl}`);
      return true;
    }

    try {
      await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: targetUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
        events: ['push', 'pull_request', 'issues', 'workflow_run'],
        active: true,
      });
      this.logger.log(`Successfully created active webhook on ${owner}/${repo}`);
      return true;
    } catch (error: any) {
      // If webhook already exists, return true gracefully
      if (error.status === 422 && error.message?.includes('already exists')) {
        this.logger.warn(`Webhook on ${owner}/${repo} already exists, skipping creation.`);
        return true;
      }
      this.logger.error(`Failed to register webhook on ${owner}/${repo}`, error);
      return false;
    }
  }
}
