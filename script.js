/**
 * Qonlab 공통 스크립트
 * - 모든 페이지에서 안전하게 동작하도록 각 기능은 해당 요소가 있을 때만 초기화합니다.
 * - 다크/화이트 테마 전환, 모바일 내비게이션, 로또 번호 생성기, 문의 폼 전송을 담당합니다.
 */

/* ---------- 테마 전환 ---------- */
(function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.dataset.theme = theme;

    if (!themeToggle) return;
    const themeIcon = themeToggle.querySelector(".theme-toggle__icon");
    const themeText = themeToggle.querySelector(".theme-toggle__text");
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "화이트 모드로 전환" : "다크 모드로 전환");
    if (themeIcon) themeIcon.textContent = isDark ? "☾" : "☀";
    if (themeText) themeText.textContent = isDark ? "다크" : "화이트";
  }

  const initialTheme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : prefersDark ? "dark" : "light";

  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", nextTheme);
      applyTheme(nextTheme);
    });
  }
})();

/* ---------- 모바일 내비게이션 ---------- */
(function initNav() {
  const navToggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (!navToggle || !nav) return;

  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
})();

/* ---------- 로또 번호 생성기 ---------- */
(function initGenerator() {
  const button = document.getElementById("actionButton");
  const numbersEl = document.getElementById("numbers");
  const bonusEl = document.getElementById("bonus");
  if (!button || !numbersEl || !bonusEl) return;

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
    const pick = generateLottoNumbers();
    numbersEl.innerHTML = pick.mainNumbers
      .map((num) => `<span class="ball">${num}</span>`)
      .join("");
    bonusEl.innerHTML = `<span class="ball" style="background:var(--surface-strong);color:var(--muted);box-shadow:none">보너스</span><span class="ball bonus-ball">${pick.bonusNumber}</span>`;
  }

  button.addEventListener("click", renderNumbers);
  renderNumbers();
})();

/* ---------- 문의 폼 전송 ---------- */
(function initPartnerForm() {
  const partnerForm = document.getElementById("partnerForm");
  const formStatus = document.getElementById("formStatus");
  if (!partnerForm || !formStatus) return;

  partnerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = partnerForm.querySelector(".form-submit");
    const formData = new FormData(partnerForm);

    if (submitButton) submitButton.disabled = true;
    formStatus.dataset.state = "pending";
    formStatus.textContent = "문의 내용을 전송하는 중입니다.";

    try {
      const response = await fetch(partnerForm.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Formspree request failed");
      }

      partnerForm.reset();
      formStatus.dataset.state = "success";
      formStatus.textContent = "문의가 접수되었습니다. 확인 후 연락드리겠습니다.";
    } catch (error) {
      formStatus.dataset.state = "error";
      formStatus.textContent = "전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 직접 보내주세요.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();

/* ---------- 최근 당첨 번호 (같은 출처 JSON에서만 읽음) ---------- */
(function initRecentResults() {
  const section = document.getElementById("recent");
  const latestEl = document.getElementById("latestDraw");
  const tableBody = document.getElementById("recentTableBody");
  const updatedEl = document.getElementById("recentUpdated");
  if (!section || !latestEl || !tableBody) return;

  function fmtWon(value) {
    if (!value || Number.isNaN(Number(value))) return "정보 없음";
    return `${Number(value).toLocaleString("ko-KR")}원`;
  }

  function ballRow(numbers, bonus) {
    const main = numbers.map((n) => `<span class="ball">${n}</span>`).join("");
    const b = bonus ? `<span class="ball bonus-ball">${bonus}</span>` : "";
    return `${main}${b}`;
  }

  fetch("./data/lotto-results.json", { headers: { Accept: "application/json" } })
    .then((res) => {
      if (!res.ok) throw new Error("data not available");
      return res.json();
    })
    .then((data) => {
      const latest = data && data.latest;
      const results = Array.isArray(data && data.results) ? data.results : [];
      if (!latest || !Array.isArray(latest.numbers) || latest.numbers.length < 6) {
        throw new Error("malformed data");
      }

      // 최신 회차 카드
      latestEl.innerHTML = `
        <div class="latest-head">
          <strong>${latest.drawNo}회</strong>
          <span>${latest.date || ""} 추첨</span>
        </div>
        <div class="latest-balls" aria-label="최신 당첨 번호">${ballRow(latest.numbers, latest.bonusNumber)}</div>
        <p class="latest-prize">1등 ${Number(latest.firstPrizeWinners || 0).toLocaleString("ko-KR")}명 · 1등 1게임당 ${fmtWon(latest.firstWinAmount)}</p>
      `;

      // 최근 회차 표 (최신 회차 제외, 최대 8개)
      const rows = results
        .slice()
        .sort((a, b) => b.drawNo - a.drawNo)
        .filter((d) => d.drawNo !== latest.drawNo && Array.isArray(d.numbers) && d.numbers.length >= 6)
        .slice(0, 8);

      tableBody.innerHTML = rows
        .map(
          (d) => `
        <tr>
          <td>${d.drawNo}회</td>
          <td>${d.date || "-"}</td>
          <td class="recent-balls-inline">${d.numbers.join(", ")}</td>
          <td class="num">+${d.bonusNumber}</td>
        </tr>`
        )
        .join("");

      if (updatedEl && data.generatedAt) {
        const dt = new Date(data.generatedAt);
        if (!Number.isNaN(dt.getTime())) {
          updatedEl.textContent = `데이터 기준 시점: ${dt.toLocaleString("ko-KR")} · 공개 데이터를 정기적으로 갱신합니다.`;
        }
      }

      // 모든 렌더링이 성공한 경우에만 노출
      section.removeAttribute("hidden");
    })
    .catch(() => {
      // 데이터가 없거나 형식이 맞지 않으면 섹션을 노출하지 않습니다(깨진 화면 방지).
      section.setAttribute("hidden", "");
    });
})();

/* ---------- 푸터 연도 자동 갱신 ---------- */
(function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
