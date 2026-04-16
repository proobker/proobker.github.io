const mobileToggle = document.getElementById("mobile-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileLinks = document.querySelectorAll(".mobile-link");
const navLinks = document.querySelectorAll(".nav-link");
const header = document.getElementById("site-header");
const sections = document.querySelectorAll("main section[id]");
const year = document.getElementById("year");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener("click", () => {
    const isExpanded = mobileToggle.getAttribute("aria-expanded") === "true";
    mobileToggle.setAttribute("aria-expanded", String(!isExpanded));
    mobileMenu.classList.toggle("open");
  });

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      mobileToggle.setAttribute("aria-expanded", "false");
    });
  });
}

window.addEventListener("scroll", () => {
  if (!header) {
    return;
  }
  header.classList.toggle("scrolled", window.scrollY > 10);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
);

document.querySelectorAll(".reveal").forEach((node) => revealObserver.observe(node));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      navLinks.forEach((navLink) => navLink.classList.remove("active"));
      const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (activeLink) {
        activeLink.classList.add("active");
      }
    });
  },
  { threshold: 0.5 }
);

sections.forEach((section) => sectionObserver.observe(section));

const ghRepos = document.getElementById("gh-repos");
const ghFollowers = document.getElementById("gh-followers");
const ghUpdated = document.getElementById("gh-updated");
const ghRepoList = document.getElementById("gh-repo-list");

const repoCard = (repo) => `
  <article class="gh-repo-card">
    <h4 class="gh-repo-title">${repo.name}</h4>
    <p class="gh-repo-desc">${
      repo.description || "No description yet — still cooking ideas."
    }</p>
    <div class="gh-repo-meta">
      <span>★ ${repo.stargazers_count ?? 0}</span>
      <span>${repo.language || "Mixed"}</span>
    </div>
    <a
      href="${repo.html_url}"
      target="_blank"
      rel="noreferrer noopener"
      class="gh-repo-link"
    >
      Open repo ↗
    </a>
  </article>
`;

const fallbackRepos = [
  {
    name: "pathfinding-visualizer",
    description: "A* based shortest-path visualization with a focus on algorithm behavior.",
    stargazers_count: 0,
    language: "Python",
    html_url: "https://github.com/proobker"
  },
  {
    name: "iot-prototype-notes",
    description: "Experimental notes and scripts for IoT automation experiments.",
    stargazers_count: 0,
    language: "Python",
    html_url: "https://github.com/proobker"
  },
  {
    name: "embedded-build-log",
    description: "Work-in-progress ideas around embedded logic and hardware-software integration.",
    stargazers_count: 0,
    language: "C",
    html_url: "https://github.com/proobker"
  }
];

async function loadGitHubData() {
  if (!ghRepos || !ghFollowers || !ghUpdated || !ghRepoList) {
    return;
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch("https://api.github.com/users/proobker"),
      fetch("https://api.github.com/users/proobker/repos?sort=updated&per_page=3")
    ]);

    if (!userRes.ok || !reposRes.ok) {
      throw new Error("GitHub API unavailable");
    }

    const user = await userRes.json();
    const repos = await reposRes.json();

    ghRepos.textContent = String(user.public_repos ?? "--");
    ghFollowers.textContent = String(user.followers ?? "--");
    ghUpdated.textContent = user.updated_at
      ? new Date(user.updated_at).toLocaleDateString()
      : "recently";

    ghRepoList.innerHTML = repos.map((repo) => repoCard(repo)).join("");
  } catch (error) {
    ghRepos.textContent = "Growing";
    ghFollowers.textContent = "Building";
    ghUpdated.textContent = "In progress";
    ghRepoList.innerHTML = fallbackRepos.map((repo) => repoCard(repo)).join("");
  }
}

loadGitHubData();
