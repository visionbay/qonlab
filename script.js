const button = document.getElementById("actionButton");
const savePickButton = document.getElementById("savePickButton");
const numbersEl = document.getElementById("numbers");
const bonusEl = document.getElementById("bonus");
const saveStatus = document.getElementById("saveStatus");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-toggle__icon");
const themeText = themeToggle.querySelector(".theme-toggle__text");
const latestStatus = document.getElementById("latestStatus");
const latestRound = document.getElementById("latestRound");
const latestDate = document.getElementById("latestDate");
const latestBalls = document.getElementById("latestBalls");
const latestMeta = document.getElementById("latestMeta");
const recentResults = document.getElementById("recentResults");
const dashboardStats = document.getElementById("dashboardStats");
const officialRankStats = document.getElementById("officialRankStats");
const officialRankEntries = document.getElementById("officialRankEntries");
const savedEntries = document.getElementById("savedEntries");
const verifiedEntries = document.getElementById("verifiedEntries");
const refreshResultsButton = document.getElementById("refreshResultsButton");
const partnerForm = document.getElementById("partnerForm");
const formStatus = document.getElementById("formStatus");

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const picksKey = "qonlab.savedPicks.v1";
const recordsKey = "qonlab.verifiedRecords.v1";
const resultCache = new Map();

let currentPick = null;
let latestResult = null;

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

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return [];
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function renderBallList(numbers, bonusNumber) {
  const mainBalls = numbers.map((num) => `<span class="ball">${num}</span>`).join("");
  const bonusBall = bonusNumber ? `<span class="ball bonus-ball">+ ${bonusNumber}</span>` : "";
  return `${mainBalls}${bonusBall}`;
}

function renderNumbers() {
  currentPick = generateLottoNumbers();

  numbersEl.innerHTML = currentPick.mainNumbers
    .map((num) => `<span class="ball">${num}</span>`)
    .join("");

  bonusEl.innerHTML = `<span class="ball">보너스</span><span class="ball">${currentPick.bonusNumber}</span>`;
  saveStatus.textContent = "";
}

function estimateLatestDrawNo() {
  const firstDrawDate = new Date("2002-12-07T20:45:00+09:00").getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - firstDrawDate;
  return Math.max(1, Math.floor(elapsed / oneWeek) + 1);
}

function normalizeDraw(data) {
  const drawNo = Number(data.drwNo || data.ltEpsd);
  const date = data.drwNoDate || formatDrawDate(data.ltRflYmd);
  const numbers = data.ltEpsd
    ? [1, 2, 3, 4, 5, 6].map((index) => Number(data[`tm${index}WnNo`]))
    : [1, 2, 3, 4, 5, 6].map((index) => Number(data[`drwtNo${index}`]));

  return {
    drawNo,
    date,
    numbers,
    bonusNumber: Number(data.bnusNo || data.bnsWnNo),
    firstPrizeWinners: Number(data.firstPrzwnerCo || data.rnk1WnNope || 0),
    firstWinAmount: Number(data.firstWinamnt || data.rnk1WnAmt || 0),
    totalSales: Number(data.totSellamnt || data.wholEpsdSumNtslAmt || data.rlvtEpsdSumNtslAmt || 0),
    ranks: {
      "1등": {
        winners: Number(data.rnk1WnNope || data.firstPrzwnerCo || 0),
        amount: Number(data.rnk1WnAmt || data.firstWinamnt || 0),
        totalAmount: Number(data.rnk1SumWnAmt || 0),
      },
      "2등": {
        winners: Number(data.rnk2WnNope || 0),
        amount: Number(data.rnk2WnAmt || 0),
        totalAmount: Number(data.rnk2SumWnAmt || 0),
      },
      "3등": {
        winners: Number(data.rnk3WnNope || 0),
        amount: Number(data.rnk3WnAmt || 0),
        totalAmount: Number(data.rnk3SumWnAmt || 0),
      },
      "4등": {
        winners: Number(data.rnk4WnNope || 0),
        amount: Number(data.rnk4WnAmt || 0),
        totalAmount: Number(data.rnk4SumWnAmt || 0),
      },
      "5등": {
        winners: Number(data.rnk5WnNope || 0),
        amount: Number(data.rnk5WnAmt || 0),
        totalAmount: Number(data.rnk5SumWnAmt || 0),
      },
    },
  };
}

function formatDrawDate(value) {
  if (!value || value.length !== 8) {
    return "";
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

async function fetchDraw(drawNo) {
  if (resultCache.has(drawNo)) {
    return resultCache.get(drawNo);
  }

  const url = `https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=${drawNo}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const data = await response.json();
  const list = data?.data?.list || [];
  const target = list.find((draw) => Number(draw.ltEpsd) === Number(drawNo));

  if (!target) {
    throw new Error(`Draw ${drawNo} is not available`);
  }

  const draw = normalizeDraw(target);
  resultCache.set(drawNo, draw);
  return draw;
}

async function fetchLatestDraw() {
  const estimated = estimateLatestDrawNo();

  for (let drawNo = estimated + 1; drawNo >= Math.max(1, estimated - 12); drawNo -= 1) {
    try {
      const response = await fetch(`https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=${drawNo}`, {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      const list = data?.data?.list || [];

      if (list.length > 0) {
        return normalizeDraw(list.sort((a, b) => Number(b.ltEpsd) - Number(a.ltEpsd))[0]);
      }
    } catch (error) {
      // 최근 추정 회차가 아직 공개되지 않았거나 브라우저에서 차단될 수 있어 이전 회차를 순차 확인합니다.
    }
  }

  throw new Error("No draw data available");
}

async function fetchCachedResults() {
  const response = await fetch("./data/lotto-results.json", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  const data = await response.json();

  if (!data.latest || !Array.isArray(data.results)) {
    throw new Error("Cached results are empty");
  }

  data.results.forEach((draw) => resultCache.set(draw.drawNo, draw));
  return {
    latest: data.latest,
    results: data.results,
    generatedAt: data.generatedAt,
  };
}

function formatCurrency(value) {
  if (!value) {
    return "정보 없음";
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

function renderLatestResult(draw) {
  latestRound.textContent = `${draw.drawNo}회`;
  latestDate.textContent = draw.date || "추첨일 정보 없음";
  latestBalls.innerHTML = renderBallList(draw.numbers, draw.bonusNumber);
  latestMeta.textContent = `1등 ${draw.firstPrizeWinners.toLocaleString("ko-KR")}명 · 1등 당첨금 ${formatCurrency(draw.firstWinAmount)}`;
}

function renderRecentResults(draws) {
  recentResults.innerHTML = draws
    .map((draw) => `
      <div class="recent-row">
        <strong>${draw.drawNo}회</strong>
        <span>${draw.numbers.join(", ")} + ${draw.bonusNumber}</span>
      </div>
    `)
    .join("");
}

function buildOfficialRankRecords(draws) {
  const withinTwoYears = draws
    .filter((draw) => {
      if (!draw.date) return false;
      const drawDate = new Date(`${draw.date}T00:00:00+09:00`);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return drawDate >= twoYearsAgo;
    })
    .sort((a, b) => b.drawNo - a.drawNo);
  const limits = { "1등": 6, "2등": 20, "3등": 47 };

  return Object.entries(limits).flatMap(([rank, limit]) =>
    withinTwoYears
      .filter((draw) => draw.ranks?.[rank]?.winners > 0)
      .slice(0, limit)
      .map((draw) => ({
        drawNo: draw.drawNo,
        date: draw.date,
        rank,
        winners: draw.ranks[rank].winners,
        amount: draw.ranks[rank].amount,
        numbers: draw.numbers,
        bonusNumber: draw.bonusNumber,
      })),
  );
}

function renderOfficialRankRecords(draws) {
  const records = buildOfficialRankRecords(draws);
  const counts = records.reduce((acc, record) => {
    acc[record.rank] = (acc[record.rank] || 0) + 1;
    return acc;
  }, {});

  officialRankStats.innerHTML = `
    <span>1등 ${counts["1등"] || 0}/6</span>
    <span>2등 ${counts["2등"] || 0}/20</span>
    <span>3등 ${counts["3등"] || 0}/47</span>
    <span>총 ${records.length}/73</span>
  `;

  officialRankEntries.innerHTML = records.length
    ? records.map((record) => `
      <div class="official-rank-entry">
        <div>
          <strong>${record.rank} · ${record.drawNo}회</strong>
          <p>${record.date} · 당첨게임 ${record.winners.toLocaleString("ko-KR")}개 · 1게임당 ${formatCurrency(record.amount)}</p>
          <p>${record.numbers.join(", ")} + ${record.bonusNumber}</p>
        </div>
      </div>
    `).join("")
    : `<p class="empty-state">공식 회차 데이터가 준비되면 최근 2년 내 1~3등 기록을 표시합니다.</p>`;
}

function getRank(numbers, draw) {
  const matched = numbers.filter((num) => draw.numbers.includes(num)).length;
  const bonusMatched = numbers.includes(draw.bonusNumber);

  if (matched === 6) return { rank: "1등", matched, bonusMatched, winning: true };
  if (matched === 5 && bonusMatched) return { rank: "2등", matched, bonusMatched, winning: true };
  if (matched === 5) return { rank: "3등", matched, bonusMatched, winning: true };
  if (matched === 4) return { rank: "4등", matched, bonusMatched, winning: true };
  if (matched === 3) return { rank: "5등", matched, bonusMatched, winning: true };
  return { rank: "낙첨", matched, bonusMatched, winning: false };
}

async function verifySavedPicks(draw) {
  const picks = readStorage(picksKey);
  const records = readStorage(recordsKey);
  const pending = [];
  const verified = [];

  for (const pick of picks) {
    if (pick.targetDraw > draw.drawNo) {
      pending.push(pick);
      continue;
    }

    try {
      const result = await fetchDraw(pick.targetDraw);
      const rank = getRank(pick.numbers, result);
      verified.push({
        ...pick,
        verifiedAt: new Date().toISOString(),
        resultNumbers: result.numbers,
        resultBonusNumber: result.bonusNumber,
        rank: rank.rank,
        matched: rank.matched,
        bonusMatched: rank.bonusMatched,
        winning: rank.winning,
      });
    } catch (error) {
      pending.push(pick);
    }
  }

  if (verified.length > 0) {
    writeStorage(picksKey, pending);
    writeStorage(recordsKey, [...verified, ...records].slice(0, 100));
  }
}

function renderDashboard() {
  const picks = readStorage(picksKey);
  const records = readStorage(recordsKey);
  const winningRecords = records.filter((record) => record.winning);
  const rankCounts = records.reduce((acc, record) => {
    acc[record.rank] = (acc[record.rank] || 0) + 1;
    return acc;
  }, {});

  dashboardStats.innerHTML = `
    <span>대기 ${picks.length}</span>
    <span>검증 ${records.length}</span>
    <span>당첨 ${winningRecords.length}</span>
    <span>1등 ${rankCounts["1등"] || 0}</span>
    <span>2등 ${rankCounts["2등"] || 0}</span>
    <span>3등 ${rankCounts["3등"] || 0}</span>
    <span>4등 ${rankCounts["4등"] || 0}</span>
  `;

  savedEntries.innerHTML = picks.length
    ? picks.map((pick) => renderPickEntry(pick)).join("")
    : `<p class="empty-state">아직 저장된 번호가 없습니다. 번호를 생성한 뒤 “다음 회차 기록에 저장”을 눌러주세요.</p>`;

  verifiedEntries.innerHTML = records.length
    ? records.map((record) => renderRecordEntry(record)).join("")
    : `<p class="empty-state">다음 회차 결과가 확인되면 저장된 번호가 자동으로 채점됩니다.</p>`;
}

function renderPickEntry(pick) {
  return `
    <div class="entry-card">
      <div>
        <strong>#${pick.entryNo} · ${pick.targetDraw}회 대기</strong>
        <p>${pick.numbers.join(", ")}</p>
      </div>
      <span>${new Date(pick.createdAt).toLocaleDateString("ko-KR")}</span>
    </div>
  `;
}

function renderRecordEntry(record) {
  const rankClass = record.winning ? "rank-win" : "rank-lose";

  return `
    <div class="entry-card">
      <div>
        <strong>#${record.entryNo} · ${record.targetDraw}회 <span class="${rankClass}">${record.rank}</span></strong>
        <p>내 번호: ${record.numbers.join(", ")}</p>
        <p>당첨 번호: ${record.resultNumbers.join(", ")} + ${record.resultBonusNumber}</p>
      </div>
      <span>${record.matched}개 일치${record.bonusMatched ? " · 보너스 일치" : ""}</span>
    </div>
  `;
}

function saveCurrentPick() {
  if (!currentPick) {
    renderNumbers();
  }

  const picks = readStorage(picksKey);
  const records = readStorage(recordsKey);
  const targetDraw = (latestResult?.drawNo || estimateLatestDrawNo()) + 1;
  const entryNo = picks.length + records.length + 1;
  const id = window.crypto?.randomUUID?.() || `${Date.now()}-${entryNo}`;

  const pick = {
    id,
    entryNo,
    targetDraw,
    numbers: currentPick.mainNumbers,
    createdAt: new Date().toISOString(),
  };

  writeStorage(picksKey, [pick, ...picks].slice(0, 100));
  saveStatus.textContent = `${targetDraw}회 검증 대기 번호로 저장했습니다.`;
  renderDashboard();
}

async function loadLottoResults() {
  latestStatus.textContent = "동행복권 회차 데이터를 불러오는 중입니다.";
  refreshResultsButton.disabled = true;

  try {
    let recentDraws = [];
    let isCached = false;

    try {
      latestResult = await fetchLatestDraw();
      for (let drawNo = latestResult.drawNo; drawNo >= Math.max(1, latestResult.drawNo - 103); drawNo -= 1) {
        recentDraws.push(await fetchDraw(drawNo));
      }
    } catch (error) {
      const cached = await fetchCachedResults();
      latestResult = cached.latest;
      recentDraws = cached.results.slice(0, 5);
      isCached = true;
    }

    renderLatestResult(latestResult);
    latestStatus.textContent = isCached
      ? "브라우저 직접 조회가 제한되어 서버 캐시 데이터를 표시 중입니다."
      : "동행복권 공개 회차 데이터를 기준으로 표시 중입니다.";
    renderRecentResults(recentDraws.slice(0, 5));
    renderOfficialRankRecords(recentDraws);
    await verifySavedPicks(latestResult);
  } catch (error) {
    latestStatus.textContent = "브라우저에서 공식 회차 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 동행복권 공식 추첨결과를 확인해 주세요.";
    latestMeta.innerHTML = `<a href="https://www.dhlottery.co.kr/" target="_blank" rel="noopener">동행복권 공식 사이트 열기</a>`;
  } finally {
    refreshResultsButton.disabled = false;
    renderDashboard();
  }
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
savePickButton.addEventListener("click", saveCurrentPick);
refreshResultsButton.addEventListener("click", loadLottoResults);
partnerForm.addEventListener("submit", handlePartnerSubmit);
applyTheme(getInitialTheme());
renderNumbers();
renderDashboard();
loadLottoResults();
