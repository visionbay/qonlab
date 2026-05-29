const button = document.getElementById("actionButton");
const numbersEl = document.getElementById("numbers");
const bonusEl = document.getElementById("bonus");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-toggle__icon");
const themeText = themeToggle.querySelector(".theme-toggle__text");

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "화이트 모드로 전환" : "다크 모드로 전환");
  themeIcon.textContent = isDark ? "☾" : "☀";
  themeText.textContent = isDark ? "다크" : "화이트";
}

function getInitialTheme() {
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return prefersDark ? "dark" : "light";
}

function generateLottoNumbers() {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const selected = [];

  for (let i = 0; i < 7; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  const mainNumbers = selected.slice(0, 6).sort((a, b) => a - b);
  const bonusNumber = selected[6];
  return { mainNumbers, bonusNumber };
}

function renderNumbers() {
  const { mainNumbers, bonusNumber } = generateLottoNumbers();

  numbersEl.innerHTML = mainNumbers
    .map((num) => `<span class="ball">${num}</span>`)
    .join("");

  bonusEl.innerHTML = `<span class="ball">보너스</span><span class="ball">${bonusNumber}</span>`;
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";

  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
});

button.addEventListener("click", renderNumbers);
applyTheme(getInitialTheme());
window.addEventListener("DOMContentLoaded", renderNumbers);
