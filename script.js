/* ----------------------------------------------------
   Rabi Dahal — Portfolio Logic
   Core scripting: interactions, scroll effects, audio,
   project rendering and GitHub integration.
---------------------------------------------------- */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ==========================================
// 1. Audio Synth Module (Web Audio API)
// ==========================================
let audioCtx = null;
let isMuted = true;

const muteBtn = document.getElementById('mute-btn');
const soundStatus = document.getElementById('sound-status');

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBlip(type) {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'hover') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.06);

    gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.06);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  } else if (type === 'click') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  }
}

if (muteBtn) {
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    isMuted = !isMuted;

    if (!isMuted) {
      initAudio();
      soundStatus.textContent = 'On';
      soundStatus.classList.add('active-status');
      muteBtn.setAttribute('aria-pressed', 'true');
      playBlip('click');
    } else {
      soundStatus.textContent = 'Off';
      soundStatus.classList.remove('active-status');
      muteBtn.setAttribute('aria-pressed', 'false');
    }
  });
}

// ==========================================
// 2. Custom Cursor Module
// ==========================================
const cursor = document.getElementById('custom-cursor');
let cursorX = 0, cursorY = 0;
let targetCursorX = 0, targetCursorY = 0;

window.addEventListener('mousemove', (e) => {
  targetCursorX = e.clientX;
  targetCursorY = e.clientY;
  if (cursor) cursor.classList.add('visible');
});

document.addEventListener('mouseleave', () => {
  if (cursor) cursor.classList.remove('visible');
});

function updateCursorPosition() {
  if (!cursor) return;
  cursorX += (targetCursorX - cursorX) * 0.2;
  cursorY += (targetCursorY - cursorY) * 0.2;
  cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
}

function setupCursorHovers() {
  const HOVER_SELECTOR = 'a, button, .project-row';
  const hoverableDescendant = (el) => el && el.closest && el.closest(HOVER_SELECTOR);
  let hoveredEl = null;

  document.addEventListener('mouseover', (e) => {
    const hit = hoverableDescendant(e.target);
    if (hit && hit !== hoveredEl) {
      hoveredEl = hit;
      if (cursor) cursor.classList.add('active');
      playBlip('hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (!hoveredEl) return;
    const nextHoverable = e.relatedTarget ? hoverableDescendant(e.relatedTarget) : null;
    if (nextHoverable !== hoveredEl) {
      hoveredEl = null;
      if (cursor) cursor.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (hoverableDescendant(e.target)) {
      playBlip('click');
    }
  });
}

// ==========================================
// 3. Typography Split & Magnetism Module
// ==========================================
function setupTextSplitting() {
  const textSplitElements = document.querySelectorAll('.text-split');
  textSplitElements.forEach(element => {
    const originalText = element.textContent.trim();
    element.setAttribute('aria-label', originalText);
    element.textContent = '';

    const words = originalText.split(/\s+/);
    words.forEach((word, i) => {
      const wordSpan = document.createElement('span');
      wordSpan.classList.add('word');
      wordSpan.setAttribute('aria-hidden', 'true');

      [...word].forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('letter-hover');
        wordSpan.appendChild(span);
      });

      element.appendChild(wordSpan);

      if (i < words.length - 1) {
        element.appendChild(document.createTextNode(' '));
      }
    });
  });
}

function setupMagneticButtons() {
  if (prefersReducedMotion) return;
  const magneticButtons = document.querySelectorAll('.hover-btn');
  magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ==========================================
// 4. Scroll triggers, Navigation, counter & timeline
// ==========================================
let statsTriggered = false;

function fireStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-num');

  statNumbers.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-target')) || 0;
    const suffix = stat.getAttribute('data-suffix') || '';

    if (prefersReducedMotion) {
      stat.textContent = target + suffix;
      return;
    }

    const duration = 1600;
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3);
      stat.textContent = Math.floor(easeProgress * target);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        stat.textContent = target + suffix;
      }
    }
    requestAnimationFrame(updateCounter);
  });
}

function triggerStatsCounter() {
  statsTriggered = true;
  fireStatsCounter();
}

function setupScrollObservers() {
  const sections = document.querySelectorAll('.scroll-section');
  const navItems = document.querySelectorAll('.nav-item');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('section-in-view');

      if (entry.target.id === 'sec-03' && !statsTriggered) {
        triggerStatsCounter();
      }
    });
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const secIndex = entry.target.id.replace('sec-', '');
      navItems.forEach(item => {
        const isActive = item.getAttribute('data-sec') === secIndex;
        item.classList.toggle('active', isActive);
        if (isActive) {
          item.setAttribute('aria-current', 'true');
        } else {
          item.removeAttribute('aria-current');
        }
      });
    });
  }, { root: null, rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(section => {
    revealObserver.observe(section);
    navObserver.observe(section);
  });
}

function trackScrollPositions() {
  // Dim the WebGL reactor once the hero is behind us so body copy stays readable
  document.body.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.55);

  const timelineRight = document.querySelector('.timeline-right');
  const timelineFill = document.getElementById('timeline-progress');

  if (!timelineRight || !timelineFill) return;

  const rect = timelineRight.getBoundingClientRect();
  const viewportAnchor = window.innerHeight * 0.6;
  const percent = Math.min(Math.max(((viewportAnchor - rect.top) / rect.height) * 100, 0), 100);
  timelineFill.style.height = `${percent}%`;
}

// ==========================================
// 5. Floating Previews Module (Section 05)
// ==========================================
function setupFloatingPreviews() {
  const previewBox = document.getElementById('floating-preview');
  const previewImg = document.getElementById('preview-img');
  if (!previewBox || !previewImg) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const projectRowOf = (el) => el && el.closest && el.closest('.project-row');

  document.addEventListener('mouseover', (e) => {
    const row = projectRowOf(e.target);
    if (row) {
      previewImg.src = row.getAttribute('data-preview');
      previewBox.classList.add('visible');
    }
  });

  document.addEventListener('mousemove', (e) => {
    const row = projectRowOf(e.target);
    if (!row || !previewBox.classList.contains('visible')) return;

    previewBox.style.left = `${e.clientX + 24}px`;
    previewBox.style.top = `${e.clientY + 24}px`;
  });

  document.addEventListener('mouseout', (e) => {
    if (!projectRowOf(e.target)) return;
    const nextRow = e.relatedTarget ? projectRowOf(e.relatedTarget) : null;
    if (nextRow) return;
    previewBox.classList.remove('visible');
  });
}

// ==========================================
// 6. Projects + GitHub Integration (Live + Fallback)
// ==========================================
const ghRepos = document.getElementById('gh-repos');
const ghFollowers = document.getElementById('gh-followers');
const ghUpdated = document.getElementById('gh-updated');

const fallbackProjectsData = {
  arcs: [
    {
      name: "qst", title: "QST", description: "RPG-style social adventure game — AI quests, proof uploads, XP badges.",
      language: "TypeScript", stars: 1, forks: 0, year: 2026,
      url: "https://github.com/proobker/qst", homepage: "https://qst-kappa.vercel.app",
      art: "assets/qst-logo.svg"
    },
    {
      name: "rakshyaa", title: "RAKSHYAA", description: "V2 of the women's safety app.",
      language: "Kotlin", stars: 2, forks: 1, year: 2026,
      url: "https://github.com/proobker/rakshyaa", homepage: "https://rakshyaa.vercel.app",
      art: "assets/project-rakshyaa.svg"
    },
    {
      name: "terrasim", title: "TERRASIM", description: "Terrain simulation engine.",
      language: "Python", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/terrasim", homepage: null,
      art: "assets/project-terrasim.svg"
    },
    {
      name: "flight-sim", title: "FLIGHT SIM", description: "SkyMesh — P2P aircraft conflict resolution simulator.",
      language: "Python", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/flight-sim", homepage: null,
      art: "assets/project-flight-sim.svg"
    }
  ],
  projects: [
    {
      name: "qst", title: "QST", description: "RPG-style social adventure game — AI quests, proof uploads, XP badges.",
      language: "TypeScript", stars: 1, forks: 0, year: 2026,
      url: "https://github.com/proobker/qst", homepage: "https://qst-kappa.vercel.app",
      art: "assets/qst-logo.svg"
    },
    {
      name: "rakshyaa", title: "RAKSHYAA", description: "V2 of the women's safety app.",
      language: "Kotlin", stars: 2, forks: 1, year: 2026,
      url: "https://github.com/proobker/rakshyaa", homepage: "https://rakshyaa.vercel.app",
      art: "assets/project-rakshyaa.svg"
    },
    {
      name: "terrasim", title: "TERRASIM", description: "Terrain simulation engine.",
      language: "Python", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/terrasim", homepage: null,
      art: "assets/project-terrasim.svg"
    },
    {
      name: "flight-sim", title: "FLIGHT SIM", description: "SkyMesh — P2P aircraft conflict resolution simulator.",
      language: "Python", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/flight-sim", homepage: null,
      art: "assets/project-flight-sim.svg"
    },
    {
      name: "cracked", title: "CRACKED", description: "A 3D first-person shooter built in Godot.",
      language: "GDScript", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/cracked", homepage: null,
      art: "assets/project-cracked.svg"
    },
    {
      name: "rakshya_app", title: "RAKSHYA APP", description: "One-tap SOS personal safety mobile app (V1).",
      language: "TypeScript", stars: 1, forks: 0, year: 2026,
      url: "https://github.com/proobker/rakshya_app", homepage: "https://rakshyaapp.github.io",
      art: "assets/project-rakshya.svg"
    },
    {
      name: "rubiks-solver", title: "RUBIKS SOLVER", description: "Interactive guide to solve a Rubik's cube and learn notation.",
      language: "TypeScript", stars: 0, forks: 0, year: 2026,
      url: "https://github.com/proobker/rubiks-solver", homepage: null,
      art: "assets/project-rubiks.svg"
    },
    {
      name: "A_Star_Algoritihm", title: "A* PATHFINDER", description: "Complete A* pathfinding visualizer for black-and-white map images.",
      language: "Python", stars: 1, forks: 0, year: 2025,
      url: "https://github.com/proobker/A_Star_Algoritihm", homepage: null,
      art: "assets/project-pathfinder.svg"
    }
  ]
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

const pad = (n) => String(n).padStart(2, '0');

const describe = (proj) => proj.description || 'Source code and notes on GitHub.';

const repoItemMarkup = (repo, index) => `
  <a class="repo-item" href="${escapeHtml(repo.url || repo.html_url)}" target="_blank" rel="noreferrer noopener">
    <div class="repo-index font-mono">${pad(index + 1)}</div>
    <div class="repo-main">
      <div class="repo-title">${escapeHtml(repo.title || repo.name)}</div>
      <div class="repo-desc">${escapeHtml(describe(repo))}</div>
    </div>
    <div class="repo-info font-mono">${escapeHtml(repo.language || '—')} · ${repo.stars ?? 0}★</div>
  </a>
`;

const arcMarkup = (proj, index) => `
  <article class="grid-span-6 arc-container">
    <a class="arc-reactor" href="${escapeHtml(proj.homepage || proj.url)}" target="_blank" rel="noreferrer noopener" aria-label="Open ${escapeHtml(proj.title)}">
      <img src="${escapeHtml(proj.art)}" alt="" class="reactor-casing" loading="lazy">
      <div class="reactor-core" aria-hidden="true"></div>
    </a>
    <div class="arc-meta">
      <div class="arc-index font-mono">${pad(index + 1)} / ${escapeHtml(proj.year)}</div>
      <h3 class="arc-title">${escapeHtml(proj.title)}</h3>
      <p class="arc-desc">${escapeHtml(describe(proj))}</p>
      <ul class="arc-tags font-mono">
        <li class="tag">${escapeHtml(proj.language || 'Multi')}</li>
        <li class="tag">${proj.stars ?? 0}★</li>
      </ul>
      <div class="arc-links font-mono">
        ${proj.homepage ? `<a href="${escapeHtml(proj.homepage)}" target="_blank" rel="noreferrer noopener">Live demo ↗</a>` : ''}
        <a href="${escapeHtml(proj.url)}" target="_blank" rel="noreferrer noopener">Source ↗</a>
      </div>
    </div>
  </article>
`;

const projectRowMarkup = (proj, index) => `
  <tr class="project-row" data-preview="${escapeHtml(proj.art)}" data-href="${escapeHtml(proj.homepage || proj.url)}" tabindex="0">
    <td class="font-mono row-index">${pad(index + 1)}</td>
    <td class="display-row-title">${escapeHtml(proj.title)}</td>
    <td class="col-desc row-desc">${escapeHtml(describe(proj))}</td>
    <td class="font-mono">${escapeHtml(proj.language || '—')}</td>
    <td class="font-mono">${escapeHtml(proj.year)}</td>
  </tr>
`;

function setupProjectRowLinks() {
  const tableBody = document.getElementById('project-table-body');
  if (!tableBody) return;

  const openRow = (row) => {
    const href = row && row.getAttribute('data-href');
    if (href) window.open(href, '_blank', 'noopener');
  };

  tableBody.addEventListener('click', (e) => openRow(e.target.closest('.project-row')));
  tableBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openRow(e.target.closest('.project-row'));
  });
}

function renderProjectsData(data) {
  const arcGallery = document.getElementById('arc-gallery');
  const tableBody = document.getElementById('project-table-body');
  const repoList = document.getElementById('gh-repo-list');
  const statProjects = document.getElementById('stat-projects');

  if (arcGallery) arcGallery.innerHTML = data.arcs.map(arcMarkup).join('');
  if (tableBody) tableBody.innerHTML = data.projects.map(projectRowMarkup).join('');
  if (repoList) repoList.innerHTML = data.projects.slice(0, 6).map(repoItemMarkup).join('');

  if (statProjects) {
    statProjects.setAttribute('data-target', String(data.projects.length));
    if (statsTriggered) fireStatsCounter();
  }
}

async function loadProjectsData() {
  try {
    const res = await fetch('assets/projects.json');
    if (!res.ok) throw new Error('projects snapshot unavailable');
    renderProjectsData(await res.json());
  } catch (error) {
    renderProjectsData(fallbackProjectsData);
  }
}

async function loadGitHubData() {
  if (!ghRepos || !ghFollowers || !ghUpdated) return;

  const setGitHubStats = (user) => {
    ghRepos.textContent = String(user.public_repos ?? '—');
    ghFollowers.textContent = String(user.followers ?? '—');
    ghUpdated.textContent = user.updated_at
      ? new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
      : '—';

    const statRepos = document.getElementById('stat-repos');
    const statFollowers = document.getElementById('stat-followers');
    if (statRepos) statRepos.setAttribute('data-target', String(user.public_repos ?? 0));
    if (statFollowers) statFollowers.setAttribute('data-target', String(user.followers ?? 0));

    if (statsTriggered) {
      fireStatsCounter();
    }
  };

  try {
    const userRes = await fetch("https://api.github.com/users/proobker");
    if (!userRes.ok) throw new Error("GitHub API unavailable");
    setGitHubStats(await userRes.json());
  } catch (error) {
    ghRepos.textContent = '—';
    ghFollowers.textContent = '—';
    ghUpdated.textContent = '—';
  }
}

// ==========================================
// 7. Frame Loop & Initialization
// ==========================================
function loop() {
  updateCursorPosition();
  trackScrollPositions();
  requestAnimationFrame(loop);
}

function init() {
  setupTextSplitting();
  setupCursorHovers();
  setupMagneticButtons();
  setupScrollObservers();
  setupFloatingPreviews();
  setupProjectRowLinks();
  loadProjectsData();
  loadGitHubData();

  requestAnimationFrame(loop);
}

// Module scripts are deferred, so DOMContentLoaded may already have fired.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Block double/triple-click word & line selection (spam-clicking the tank kept
// highlighting text). Click-and-drag selection still works for copying.
document.addEventListener('mousedown', (e) => {
  if (e.detail > 1) e.preventDefault();
});

// --- MOBILE MENU LOGIC ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarNav = document.getElementById('sidebar-nav');

if (mobileMenuBtn && sidebarNav) {
  const closeMenu = () => {
    sidebarNav.classList.remove('menu-open');
    mobileMenuBtn.classList.remove('menu-open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  };

  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = sidebarNav.classList.toggle('menu-open');
    mobileMenuBtn.classList.toggle('menu-open');
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  sidebarNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarNav.classList.contains('menu-open')) {
      closeMenu();
      mobileMenuBtn.focus();
    }
  });
}
