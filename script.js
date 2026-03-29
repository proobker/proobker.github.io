// subtle parallax
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  document.querySelector(".hero").style.transform =
    `translateY(${scrollY * 0.2}px)`;
});

// smooth scroll
document.querySelectorAll("a[href^='#']").forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href"))
      .scrollIntoView({ behavior: "smooth" });
  });
});
