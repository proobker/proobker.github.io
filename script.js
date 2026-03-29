
/* RAF LOOP ENGINE */
let scrollY = 0;
let targetY = 0;

function loop() {
  targetY = window.scrollY;
  scrollY += (targetY - scrollY) * 0.08;

  updateScrollEffects(scrollY);

  requestAnimationFrame(loop);
}
loop();

/* SCROLL STORY */
const frames = document.querySelectorAll(".frame");
const section = document.querySelector(".scroll-section");

function updateScrollEffects(y) {
  const rect = section.getBoundingClientRect();
  const progress = -rect.top / (rect.height - window.innerHeight);

  const index = Math.floor(progress * frames.length);

  frames.forEach(f => f.classList.remove("active"));
  if (frames[index]) frames[index].classList.add("active");

  updateHero(y);
}

/* HERO PARALLAX */
const phone = document.getElementById("phone");

function updateHero(y) {
  if (y < window.innerHeight) {
    phone.style.transform =
      `translateY(${y * 0.2}px) scale(${1 - y*0.0003})`;
  }
}

/* 3D TILT */
document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;

  phone.style.transform += ` rotateY(${x}deg) rotateX(${-y}deg)`;
});

/* NAV SMOOTH */
document.querySelectorAll("a[href^='#']").forEach(a=>{
  a.onclick=(e)=>{
    e.preventDefault();
    document.querySelector(a.getAttribute("href"))
      .scrollIntoView({behavior:"smooth"});
  };
});

/* LOAD FADE */
window.onload = () => {
  document.body.style.opacity = 0;
  document.body.style.transition = "1s";
  setTimeout(()=>document.body.style.opacity=1,100);
};

console.log("RAKSHYA ULTRA MODE ACTIVE");
