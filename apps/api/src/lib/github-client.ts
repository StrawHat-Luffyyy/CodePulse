interface GithubFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export class GithubClient {
  private baseUrl = "https://api.github.com";

  constructor(private accessToken: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options?.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${response.status} ,${error.message}`);
    }
    return response.json() as Promise<T>;
  }

  async getPullRequestFiles(owner: string, repo: string, pullNumber: number) {
    return this.request<GithubFile[]>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
    );
  }

  async createReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    comment: {
      body: string;
      path: string;
      line: number;
      side?: "RIGHT";
    },
  ) {
    return this.request(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: comment.body,
          path: comment.path,
          line: comment.line,
          side: comment.side || "RIGHT",
          // commit_id : '' // will fill in later
        }),
      },
    );
  }

  async createPRComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
  ) {
    return this.request(
      `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  }
}
