import "dotenv/config";
import { Octokit } from "@octokit/rest";

import type { Endpoints } from "@octokit/types";

type UserRepos = Endpoints["GET /user/repos"]["response"]["data"];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

function supportedLang(rawLang: string | null): boolean {
  const lang = rawLang?.toLowerCase();
  return lang === "javascript" || lang === "typescript";
}

async function getAllRepoNames() {
  // Get all issues for a repository
  const repos: UserRepos = await octokit.paginate("GET /users/{owner}/repos", {
    owner: "sindresorhus",
  });

  return repos
    .filter(repo => !repo.archived && !repo.fork && supportedLang(repo.language))
    .map(repo => repo.name);
}

async function checkESMSupport(repo: string): Promise<boolean> {
  const response = await fetch(
    `https://raw.githubusercontent.com/sindresorhus/${repo}/main/package.json`,
    {
      headers: {
        Accept: "application/vnd.github.v3.raw",
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  return data.type === "module";
}

async function main() {
  const repos = await getAllRepoNames();
  console.log(`Checking ${repos.length} repos for ESM support`);
  const totalRepos = repos.length;

  const repoMap: Record<string, boolean> = {};
  for (const repo of repos) {
    const supportsESM = await checkESMSupport(repo);
    repoMap[repo] = supportsESM;
  }

  const reposWithEsmSupportPercentage = Math.floor(
    (Object.values(repoMap).filter((support) => support).length / totalRepos) *
      100,
  );

  const reposWithNonEsmSupportPercentage = Math.floor(
    (Object.values(repoMap).filter((support) => !support).length / totalRepos) *
      100,
  );

  console.log(`✅ Percentage ESM Repos ${reposWithEsmSupportPercentage}%`);
  console.log(
    `🚫 Percentage Non-ESM Repos ${reposWithNonEsmSupportPercentage}%`,
  );
  console.log("");

  for (const [repo, supportsESM] of Object.entries(repoMap)) {
    console.log(`${supportsESM ? "✅" : "🚫"} sindresorhus/${repo}`);
  }
}

main();
