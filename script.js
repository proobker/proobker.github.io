/* FINAL BOSS SCROLL ENGINE */

// SMOOTH SCROLL
document.querySelectorAll("a[href^='#']").forEach(anchor => {
  anchor.addEventListener("click", e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute("href"))
      .scrollIntoView({ behavior: "smooth" });
  });
});

/* HERO PARALLAX */
const heroPhone = document.querySelector(".hero-phone");

window.addEventListener("scroll", () => {
  let y = window.scrollY;
  heroPhone.style.transform = `translateY(${y * 0.2}px) scale(${1 - y*0.0003})`;
});

/* STICKY SLIDES */
const slides = document.querySelectorAll(".slide");

window.addEventListener("scroll", () => {
  const section = document.querySelector(".sticky-section");
  const rect = section.getBoundingClientRect();
  const progress = -rect.top / (rect.height - window.innerHeight);

  let index = Math.floor(progress * slides.length);

  slides.forEach(s => s.classList.remove("active"));

  if (slides[index]) {
    slides[index].classList.add("active");
  }
});

/* FADE-IN GRID */
const cards = document.querySelectorAll(".card");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = 1;
      entry.target.style.transform = "translateY(0)";
    }
  });
});

cards.forEach(card => {
  card.style.opacity = 0;
  card.style.transform = "translateY(40px)";
  card.style.transition = "0.6s";
  observer.observe(card);
});

/* NAV ANIMATION */
const nav = document.querySelector(".nav");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    nav.style.transform = "translateX(-50%) scale(0.95)";
  } else {
    nav.style.transform = "translateX(-50%) scale(1)";
  }
});

/* INTRO FADE */
window.onload = () => {
  document.body.style.opacity = 0;
  document.body.style.transition = "1s";
  setTimeout(() => {
    document.body.style.opacity = 1;
  }, 100);
};

console.log("Rakshya Final Boss Loaded");
