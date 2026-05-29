const button = document.getElementById("actionButton");
const numbersEl = document.getElementById("numbers");
const bonusEl = document.getElementById("bonus");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-toggle__icon");
const themeText = themeToggle.querySelector(".theme-toggle__text");
const partnerForm = document.getElementById("partnerForm");
const formStatus = document.getElementById("formStatus");

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

async function handlePartnerSubmit(event) {
  event.preventDefault();

  const submitButton = partnerForm.querySelector(".form-submit");
  const formData = new FormData(partnerForm);

  submitButton.disabled = true;
  formStatus.dataset.state = "pending";
  formStatus.textContent = "문의 내용을 전송하는 중입니다.";

  try {
    const response = await fetch(partnerForm.action, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Formspree request failed");
    }

    partnerForm.reset();
    formStatus.dataset.state = "success";
    formStatus.textContent = "문의가 접수되었습니다. 확인 후 연락드리겠습니다.";
  } catch (error) {
    formStatus.dataset.state = "error";
    formStatus.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  } finally {
    submitButton.disabled = false;
  }
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";

  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
});

button.addEventListener("click", renderNumbers);
partnerForm.addEventListener("submit", handlePartnerSubmit);
applyTheme(getInitialTheme());
window.addEventListener("DOMContentLoaded", renderNumbers);
