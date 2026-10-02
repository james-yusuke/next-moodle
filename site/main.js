const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scroll reveal
const revealTargets = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );
  revealTargets.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
    observer.observe(el);
  });
} else {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
}

// Count-up numbers
const counters = document.querySelectorAll("[data-count]");
const runCounter = (el) => {
  const target = Number(el.dataset.count);
  if (reduceMotion || target === 0) {
    el.textContent = String(target);
    return;
  }
  const duration = 1400;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      runCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
  counters.forEach((el) => counterObserver.observe(el));
} else {
  counters.forEach(runCounter);
}

// Cursor glow + feature spotlight
const glow = document.querySelector(".cursor-glow");
if (glow && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener(
    "pointermove",
    (e) => {
      glow.style.setProperty("--x", `${e.clientX}px`);
      glow.style.setProperty("--y", `${e.clientY}px`);
    },
    { passive: true },
  );
}

document.querySelectorAll(".feature").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
});

// Copy commands
const copyButton = document.querySelector("[data-copy]");
const cmd = document.getElementById("cmd");
if (copyButton && cmd) {
  copyButton.addEventListener("click", async () => {
    const text = cmd.innerText
      .split("\n")
      .filter((line) => line.startsWith("$"))
      .map((line) => line.replace(/^\$\s*/, ""))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "COPIED!";
    } catch {
      copyButton.textContent = "FAILED";
    }
    setTimeout(() => {
      copyButton.textContent = "COPY";
    }, 1600);
  });
}
