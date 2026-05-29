const button = document.getElementById("actionButton");
const numbersEl = document.getElementById("numbers");
const bonusEl = document.getElementById("bonus");

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
    .map(num => `<span class="ball">${num}</span>`)
    .join("");

  bonusEl.innerHTML = `<span class="ball">보너스</span><span class="ball">${bonusNumber}</span>`;
}

button.addEventListener("click", renderNumbers);
window.addEventListener("DOMContentLoaded", renderNumbers);
