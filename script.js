/* ----------------------------------------------------
   Rabi Dahal — Brutalist Swiss Systems Portfolio Logic
   Core scripting: interactions, scroll effects, audio,
   Vektor guides, accent control, and GitHub integration.
---------------------------------------------------- */

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
  initAudio();
  if (isMuted || !audioCtx) return;

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
      soundStatus.textContent = 'ON';
      soundStatus.classList.add('active-status');
      muteBtn.setAttribute('aria-pressed', 'true');
      playBlip('click');
    } else {
      soundStatus.textContent = 'MUTED';
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
});

function updateCursorPosition() {
  if (!cursor) return;
  cursorX += (targetCursorX - cursorX) * 0.15;
  cursorY += (targetCursorY - cursorY) * 0.15;
  cursor.style.left = `${cursorX}px`;
  cursor.style.top = `${cursorY}px`;
}

function setupCursorHovers() {
  const hoverables = document.querySelectorAll('.hover-btn, .nav-item, .record-sleeve, .project-row, .vibe-btn, .repo-item');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (cursor) cursor.classList.add('active');
      playBlip('hover');
    });
    el.addEventListener('mouseleave', () => {
      if (cursor) cursor.classList.remove('active');
    });
    el.addEventListener('click', () => {
      playBlip('click');
    });
  });
}

// ==========================================
// 3. Typography Split & Magnetism Module
// ==========================================
function setupTextSplitting() {
  const textSplitElements = document.querySelectorAll('.text-split');
  textSplitElements.forEach(element => {
    const originalText = element.textContent.trim();
    element.textContent = '';

    [...originalText].forEach(char => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      if (char !== ' ') {
        span.classList.add('letter-hover');
        span.addEventListener('mouseenter', () => playBlip('hover'));
      }
      element.appendChild(span);
    });
  });
}

function setupMagneticButtons() {
  const magneticButtons = document.querySelectorAll('.hover-btn');
  magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
}

// ==========================================
// 4. Intro Overlay Controller
// ==========================================
function runIntroSequence() {
  const introOverlay = document.querySelector('.intro-overlay');
  const loaderBar = document.getElementById('intro-bar');
  if (!introOverlay || !loaderBar) return;

  let introDone = false;

  function dismissIntro() {
    if (introDone) return;
    introDone = true;
    introOverlay.classList.add('dismissed');
    setTimeout(() => {
      introOverlay.style.display = 'none';
    }, 1200);
  }

  setTimeout(() => {
    loaderBar.style.width = '100%';
  }, 100);

  setTimeout(() => {
    dismissIntro();
    setTimeout(() => triggerVektor('sec-01'), 300);
  }, 2600);

  introOverlay.addEventListener('click', () => {
    playBlip('click');
    dismissIntro();
    triggerVektor('sec-01');
  });
}

// ==========================================
// 5. Scroll triggers, Navigation, counter & timeline
// ==========================================
let statsTriggered = false;

function fireStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-num');

  statNumbers.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-target')) || 0;
    const duration = 2000;
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * target);

      stat.textContent = currentVal;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        stat.textContent = target;
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

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -20% 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');

        entry.target.classList.add('section-in-view');

        const secIndex = id.replace('sec-', '');
        navItems.forEach(item => {
          if (item.getAttribute('data-sec') === secIndex) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });

        if (id === 'sec-03' && !statsTriggered) {
          triggerStatsCounter();
        }

        triggerVektor(id);
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
}

function trackScrollPositions() {
  const timelineSection = document.getElementById('sec-06');
  const timelineFill = document.getElementById('timeline-progress');

  if (!timelineSection || !timelineFill) return;

  const rect = timelineSection.getBoundingClientRect();
  const sectionHeight = rect.height;
  const viewportHeight = window.innerHeight;

  const relativeScroll = -rect.top;
  const scrollRange = sectionHeight - viewportHeight;

  if (scrollRange > 0) {
    const percent = Math.min(Math.max((relativeScroll / scrollRange) * 100, 0), 100);
    timelineFill.style.height = `${percent}%`;
  }
}

// ==========================================
// 6. VEKTOR Guide System
// ==========================================
let vektorBusy = false;
const triggeredVektor = {};

const vektorNarrations = {
  'sec-00': "VEKTOR: BOOT SEQUENCE COMPLETE. RABI DAHAL ONLINE. SCROLL TO TRAVERSE THE SYSTEM.",
  'sec-01': "VEKTOR: LOG ENTRY [01] — PCB ROTATION LINKED TO SCROLL DEPTH. WELCOME.",
  'sec-02': "VEKTOR: BIO REGISTERED. KATHMANDU GRID LOCKED. HOVER ELEMENTS TO ENGAGE.",
  'sec-04': "VEKTOR: DISC RACKS LOADED. SWISS GRID OVERRIDES STYLINGS. ROTATION COMMITTED.",
  'sec-05': "VEKTOR: PROJECT GRAPHICS ENCODED. FLOATING BUFFERS DETECT MOUSE COORDINATES.",
  'sec-06': "VEKTOR: TIMELINE SCANNER COMMITTING. PROGRESS CORRESPONDS TO DEPTH.",
  'sec-07': "VEKTOR: GITHUB ARCHIVE LINKED. LIVE REPOSITORY COUNTS INCOMING.",
  'sec-08': "VEKTOR: ENDPOINT ENCOUNTERED. ACTIVATE ACCENT VIBES TO RESHAPE THE SYSTEM."
};

function triggerVektor(sectionId) {
  if (vektorBusy || triggeredVektor[sectionId] || !vektorNarrations[sectionId]) return;

  triggeredVektor[sectionId] = true;
  vektorBusy = true;

  const text = vektorNarrations[sectionId];
  const container = document.getElementById('vektor-container');
  const textContainer = document.getElementById('vektor-text');

  container.className = 'drawing';
  textContainer.textContent = '';

  let charIndex = 0;

  function typeCharacter() {
    if (charIndex < text.length) {
      textContainer.textContent += text.charAt(charIndex);
      charIndex++;
      setTimeout(typeCharacter, 25);
    } else {
      setTimeout(retractVektorGuide, 4500);
    }
  }

  setTimeout(typeCharacter, 600);

  function retractVektorGuide() {
    container.className = 'retracting';
    setTimeout(() => {
      container.className = 'vektor-hidden';
      vektorBusy = false;
    }, 1500);
  }
}

// ==========================================
// 7. Floating Previews Module (Section 05)
// ==========================================
function setupFloatingPreviews() {
  const previewBox = document.getElementById('floating-preview');
  const previewImg = document.getElementById('preview-img');
  const tableRows = document.querySelectorAll('.project-row');

  tableRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      const src = row.getAttribute('data-preview');
      previewImg.src = src;
      previewBox.classList.add('visible');
    });

    row.addEventListener('mousemove', (e) => {
      const x = e.clientX + 20;
      const y = e.clientY + 20;
      previewBox.style.left = `${x}px`;
      previewBox.style.top = `${y}px`;

      const rect = row.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
      const tiltY = relativeX * 25;
      previewBox.style.transform = `translate(-50%, -50%) rotateY(${tiltY}deg) rotateX(10deg)`;
    });

    row.addEventListener('mouseleave', () => {
      previewBox.classList.remove('visible');
      previewBox.style.transform = 'translate(-50%, -50%) scale(0.6)';
    });

    row.addEventListener('click', (e) => {
      if (window.matchMedia('(pointer: coarse)').matches) {
        e.preventDefault();
        const src = row.getAttribute('data-preview');
        if (previewBox.classList.contains('visible')) {
          previewBox.classList.remove('visible');
          return;
        }
        previewImg.src = src;
        previewBox.classList.add('visible');
        const rect = row.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        previewBox.style.left = `${x}px`;
        previewBox.style.top = `${y}px`;
        previewBox.style.transform = 'translate(-50%, -50%) rotateX(8deg)';
      }
    });
  });
}

// ==========================================
// 8. Interactive Pointing Hand (Footer)
// ==========================================
const handRotator = document.getElementById('hand-rotator');
const handLabel = document.getElementById('hand-target-label');
const contactLinks = document.querySelectorAll('.contact-link');
const contactSection = document.getElementById('sec-08');

let targetAngle = 0;
let currentAngle = 0;

function setupPointingHand() {
  window.addEventListener('mousemove', (e) => {
    let closestLink = null;
    let minDistance = 250;

    contactLinks.forEach(link => {
      const rect = link.getBoundingClientRect();
      const linkCenterX = rect.left + rect.width / 2;
      const linkCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - linkCenterX, e.clientY - linkCenterY);

      if (dist < minDistance) {
        minDistance = dist;
        closestLink = link;
      }
    });

    const handSvg = document.getElementById('pointing-hand-svg');
    if (!handSvg) return;

    const handRect = handSvg.getBoundingClientRect();
    const pivotX = handRect.left + (handRect.width * 0.5);
    const pivotY = handRect.top + (handRect.height * 0.62);

    let focusX, focusY;

    if (closestLink) {
      const linkRect = closestLink.getBoundingClientRect();
      focusX = linkRect.left + linkRect.width / 2;
      focusY = linkRect.top + linkRect.height / 2;

      const label = closestLink.getAttribute('data-label');
      handLabel.textContent = `POINTING AT: [${label.toUpperCase()}]`;
      handLabel.classList.add('text-accent');
    } else {
      const secRect = contactSection.getBoundingClientRect();
      if (secRect.top < window.innerHeight && secRect.bottom > 0) {
        focusX = e.clientX;
        focusY = e.clientY;
        handLabel.textContent = `POINTING DETECTED`;
        handLabel.classList.remove('text-accent');
      } else {
        targetAngle = 0;
        handLabel.textContent = `[ POINTING IDLE ]`;
        handLabel.classList.remove('text-accent');
        return;
      }
    }

    const dx = focusX - pivotX;
    const dy = focusY - pivotY;
    const angleRad = Math.atan2(dy, dx);
    targetAngle = angleRad * (180 / Math.PI);
  });
}

function updateHandRotation() {
  currentAngle += (targetAngle - currentAngle) * 0.12;
  if (handRotator) {
    handRotator.style.transformOrigin = '50px 62px';
    handRotator.style.transform = `rotate(${currentAngle}deg)`;
  }
}

// ==========================================
// 9. Accent Color Control (Manual Vibe Presets)
// ==========================================
const vibeBtns = document.querySelectorAll('.vibe-btn');

let currentRGB = { r: 0, g: 229, b: 255 };
let targetRGB = { r: 0, g: 229, b: 255 };

vibeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const hex = btn.getAttribute('data-color');
    const rgb = hexToRgb(hex);
    if (rgb) {
      targetRGB = rgb;
      playBlip('click');
    }
  });
});

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

const componentToHex = (c) => {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbToHex = (r, g, b) => "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);

function updateAccentInterpolation() {
  currentRGB.r += (targetRGB.r - currentRGB.r) * 0.08;
  currentRGB.g += (targetRGB.g - currentRGB.g) * 0.08;
  currentRGB.b += (targetRGB.b - currentRGB.b) * 0.08;

  const hexVal = rgbToHex(
    Math.round(currentRGB.r),
    Math.round(currentRGB.g),
    Math.round(currentRGB.b)
  );
  document.documentElement.style.setProperty('--accent', hexVal);
}

// ==========================================
// 10. GitHub Integration (Live + Fallback)
// ==========================================
const ghRepos = document.getElementById('gh-repos');
const ghFollowers = document.getElementById('gh-followers');
const ghUpdated = document.getElementById('gh-updated');
const ghRepoList = document.getElementById('gh-repo-list');

const fallbackRepos = [
  {
    name: "qst",
    description: "Real-life activities into an RPG-style quest game",
    language: "TypeScript",
    html_url: "https://github.com/proobker/qst"
  },
  {
    name: "rakshya_app",
    description: "One-tap SOS personal safety mobile app",
    language: "Dart",
    html_url: "https://github.com/proobker/rakshya_app"
  },
  {
    name: "pathfinding-visualizer",
    description: "A* based shortest-path algorithm visualization",
    language: "Python",
    html_url: "https://github.com/proobker/pathfinding-visualizer"
  }
];

const repoItemMarkup = (repo, index) => `
  <a class="repo-item" href="${repo.html_url}" target="_blank" rel="noreferrer noopener">
    <div class="repo-index">${String(index + 1).padStart(2, '0')}</div>
    <div class="repo-title">${repo.name}</div>
    <div class="repo-info">${repo.language || '---'} // ${repo.stargazers_count ?? 0}★</div>
  </a>
`;

async function loadGitHubData() {
  if (!ghRepos || !ghFollowers || !ghUpdated || !ghRepoList) return;

  const setGitHubStats = (user, repos) => {
    ghRepos.textContent = String(user.public_repos ?? '--');
    ghFollowers.textContent = String(user.followers ?? '--');
    ghUpdated.textContent = user.updated_at
      ? new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
      : 'recent';

    ghRepoList.innerHTML = repos.map((repo, i) => repoItemMarkup(repo, i)).join('');

    const statRepos = document.getElementById('stat-repos');
    const statFollowers = document.getElementById('stat-followers');
    if (statRepos) statRepos.setAttribute('data-target', String(user.public_repos ?? 0));
    if (statFollowers) statFollowers.setAttribute('data-target', String(user.followers ?? 0));

    if (statsTriggered) {
      fireStatsCounter();
    }
  };

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

    setGitHubStats(user, repos);
  } catch (error) {
    ghRepos.textContent = '3+';
    ghFollowers.textContent = 'Growing';
    ghUpdated.textContent = 'In progress';
    ghRepoList.innerHTML = fallbackRepos.map((repo, i) => repoItemMarkup(repo, i)).join('');
  }
}

// ==========================================
// 11. Frame Loop & Initialization
// ==========================================
function loop() {
  updateCursorPosition();
  updateHandRotation();
  updateAccentInterpolation();
  trackScrollPositions();
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', () => {
  setupTextSplitting();
  setupCursorHovers();
  setupMagneticButtons();
  setupScrollObservers();
  setupFloatingPreviews();
  setupPointingHand();
  runIntroSequence();
  loadGitHubData();

  requestAnimationFrame(loop);
});

// --- MOBILE MENU LOGIC ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarNav = document.getElementById('sidebar-nav');

if (mobileMenuBtn && sidebarNav) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = sidebarNav.classList.toggle('menu-open');
    mobileMenuBtn.classList.toggle('menu-open');
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  sidebarNav.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      sidebarNav.classList.remove('menu-open');
      mobileMenuBtn.classList.remove('menu-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarNav.classList.contains('menu-open')) {
      sidebarNav.classList.remove('menu-open');
      mobileMenuBtn.classList.remove('menu-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      mobileMenuBtn.focus();
    }
  });
}