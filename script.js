/* ===============================
   RAKSHYA LANDING JS (PRO LEVEL)
   =============================== */

/* ---------- UTIL: EASING SCROLL ---------- */
function smoothScroll(target, duration = 800) {
  const element = document.querySelector(target);
  const start = window.scrollY;
  const end = element.offsetTop - 80;
  const distance = end - start;
  let startTime = null;

  function ease(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);

    window.scrollTo(0, start + distance * ease(progress));

    if (progress < 1) requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
}

/* ---------- NAVBAR BEHAVIOR ---------- */
const nav = document.querySelector(".nav");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    nav.style.background = "rgba(10,10,10,0.8)";
    nav.style.backdropFilter = "blur(16px)";
    nav.style.transform = "translateX(-50%) scale(0.98)";
  } else {
    nav.style.background = "rgba(20,20,20,0.6)";
    nav.style.backdropFilter = "blur(12px)";
    nav.style.transform = "translateX(-50%) scale(1)";
  }
});

/* ---------- INTERSECTION OBSERVER ---------- */
const observerOptions = {
  threshold: 0.2
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      const el = entry.target;

      // stagger effect
      setTimeout(() => {
        el.classList.add("active");
      }, index * 80);

      observer.unobserve(el);
    }
  });
}, observerOptions);

/* TARGET ELEMENTS */
document.querySelectorAll(
  ".panel, .card, .arch-block, .security-grid div"
).forEach(el => observer.observe(el));

/* ---------- PARALLAX HERO ---------- */
const hero = document.querySelector(".hero");
const heroContent = document.querySelector(".hero-content");
const heroVisual = document.querySelector(".hero-visual");

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;

  if (scrollY < window.innerHeight) {
    heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
    heroVisual.style.transform = `translateY(${scrollY * 0.15}px) scale(${1 - scrollY * 0.0003})`;
  }
});

/* ---------- SMOOTH NAV LINKS ---------- */
document.querySelectorAll("a[href^='#']").forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = this.getAttribute("href");
    smoothScroll(target);
  });
});

/* ---------- VIDEO AUTO PLAY HANDLING ---------- */
const videos = document.querySelectorAll("video");

videos.forEach(video => {
  video.addEventListener("mouseenter", () => {
    video.play();
  });

  video.addEventListener("mouseleave", () => {
    video.pause();
  });
});

/* ---------- HERO FADE-IN ---------- */
window.addEventListener("load", () => {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 1s ease";

  setTimeout(() => {
    document.body.style.opacity = "1";
  }, 100);
});

/* ---------- SUBTLE MOUSE PARALLAX ---------- */
document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 10;
  const y = (e.clientY / window.innerHeight - 0.5) * 10;

  heroVisual.style.transform += ` translate(${x}px, ${y}px)`;
});

/* ---------- PERFORMANCE OPTIMIZATION ---------- */
let ticking = false;

function handleScroll() {
  // future scroll-linked animations here
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(handleScroll);
    ticking = true;
  }
});

/* ---------- CONSOLE SIGNATURE ---------- */
console.log(
  "%cRakshya v3.0 — Safety System Active",
  "color: red; font-size: 16px; font-weight: bold;"
);
