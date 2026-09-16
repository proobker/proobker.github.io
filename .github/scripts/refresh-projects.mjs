/* ----------------------------------------------------
   Refresh Projects Data
   Fetches live metadata for the curated project repos
   and writes assets/projects.json for the site to read.
   Runs as a GitHub Action with GITHUB_TOKEN; also runs
   locally against the public API (no token required).
----------------------------------------------------- */

import { writeFileSync } from 'fs';

const GITHUB_USER = 'proobker';
const HEADERS = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {})
};

// Curated showcase: 8 original projects, arc-tier first (most complex).
const MANIFEST = [
  { name: 'qst',         tier: 'primary',   art: 'assets/qst-logo.svg' },
  { name: 'rakshyaa',    tier: 'primary',   art: 'assets/project-rakshyaa.svg' },
  { name: 'terrasim',    tier: 'primary',   art: 'assets/project-terrasim.svg' },
  { name: 'flight-sim',  tier: 'primary',   art: 'assets/project-flight-sim.svg' },
  { name: 'rakshya_app', tier: 'secondary', art: 'assets/project-rakshya.svg' },
  { name: 'rubiks-solver', tier: 'secondary', art: 'assets/project-rubiks.svg' },
  { name: 'bnks',        tier: 'secondary', art: 'assets/project-bnks.svg' },
  { name: 'A_Star_Algoritihm', tier: 'secondary', art: 'assets/project-pathfinder.svg', title: 'A* PATHFINDER' }
];

const toTitle = (name) =>
  name.replace(/[_-]+/g, ' ').trim().toUpperCase();

const toTags = (repo) => {
  const year = new Date(repo.created_at).getFullYear();
  const parts = [
    (repo.language || 'MULTI').toUpperCase(),
    `${repo.stargazers_count}★`,
    `${repo.forks_count} FORKS`,
    String(year)
  ];
  return parts.join(' // ');
};

async function fetchAllRepos() {
  let page = 1;
  let all = [];
  let fetched;
  do {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    fetched = await res.json();
    all = all.concat(fetched);
    page += 1;
  } while (fetched.length === 100);
  return all;
}

function enrich(repo, manifestEntry) {
  return {
    name: repo.name,
    title: manifestEntry.title || toTitle(repo.name),
    description: repo.description || '',
    language: repo.language || null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    year: new Date(repo.created_at).getFullYear(),
    updated_at: repo.pushed_at || repo.updated_at,
    url: repo.html_url,
    homepage: repo.homepage || null,
    art: manifestEntry.art,
    tags: toTags(repo),
    tier: manifestEntry.tier
  };
}

async function main() {
  const repos = await fetchAllRepos();
  const byName = new Map(repos.map((r) => [r.name, r]));

  const projects = MANIFEST
    .map((entry) => {
      const repo = byName.get(entry.name);
      if (!repo) {
        console.warn(`WARN: repo "${entry.name}" not found, skipping.`);
        return null;
      }
      return enrich(repo, entry);
    })
    .filter(Boolean);

  const arcs = projects.filter((p) => p.tier === 'primary');
  const output = {
    generatedAt: new Date().toISOString(),
    arcs,
    projects
  };

  writeFileSync('assets/projects.json', JSON.stringify(output, null, 2) + '\n');
  console.log(`wrote assets/projects.json — ${projects.length} projects, ${arcs.length} arcs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});