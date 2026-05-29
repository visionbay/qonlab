import { mkdir, writeFile } from "node:fs/promises";

const outputPath = new URL("../data/lotto-results.json", import.meta.url);
const apiBase = "https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do";

function estimateLatestDrawNo() {
  const firstDrawDate = new Date("2002-12-07T20:45:00+09:00").getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - firstDrawDate;
  return Math.max(1, Math.floor(elapsed / oneWeek) + 1);
}

function formatDrawDate(value) {
  if (!value || value.length !== 8) {
    return "";
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function normalizeDraw(data) {
  return {
    drawNo: Number(data.ltEpsd),
    date: formatDrawDate(data.ltRflYmd),
    numbers: [1, 2, 3, 4, 5, 6].map((index) => Number(data[`tm${index}WnNo`])),
    bonusNumber: Number(data.bnsWnNo),
    firstPrizeWinners: Number(data.rnk1WnNope || 0),
    firstWinAmount: Number(data.rnk1WnAmt || 0),
    totalSales: Number(data.wholEpsdSumNtslAmt || data.rlvtEpsdSumNtslAmt || 0),
    ranks: {
      "1등": {
        winners: Number(data.rnk1WnNope || 0),
        amount: Number(data.rnk1WnAmt || 0),
        totalAmount: Number(data.rnk1WnNope || 0) * Number(data.rnk1WnAmt || 0),
      },
      "2등": {
        winners: Number(data.rnk2WnNope || 0),
        amount: Number(data.rnk2WnAmt || 0),
        totalAmount: Number(data.rnk2WnNope || 0) * Number(data.rnk2WnAmt || 0),
      },
      "3등": {
        winners: Number(data.rnk3WnNope || 0),
        amount: Number(data.rnk3WnAmt || 0),
        totalAmount: Number(data.rnk3WnNope || 0) * Number(data.rnk3WnAmt || 0),
      },
      "4등": {
        winners: Number(data.rnk4WnNope || 0),
        amount: Number(data.rnk4WnAmt || 0),
        totalAmount: Number(data.rnk4WnNope || 0) * Number(data.rnk4WnAmt || 0),
      },
      "5등": {
        winners: Number(data.rnk5WnNope || 0),
        amount: Number(data.rnk5WnAmt || 0),
        totalAmount: Number(data.rnk5WnNope || 0) * Number(data.rnk5WnAmt || 0),
      },
    },
  };
}

async function fetchDrawWindow(drawNo) {
  const url = new URL(apiBase);
  url.searchParams.set("srchDir", "center");
  url.searchParams.set("srchLtEpsd", String(drawNo));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Qonlab-Lotto-Result-Updater/1.0",
      Referer: "https://www.dhlottery.co.kr/lt645/result",
    },
  });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Draw window ${drawNo} did not return JSON`);
  }

  const list = data?.data?.list || [];

  if (list.length === 0) {
    throw new Error(`Draw window ${drawNo} is empty`);
  }

  return list.map(normalizeDraw);
}

async function findLatestDraw() {
  const estimated = estimateLatestDrawNo();

  for (let drawNo = estimated + 1; drawNo >= Math.max(1, estimated - 12); drawNo -= 1) {
    try {
      const draws = await fetchDrawWindow(drawNo);
      return draws.sort((a, b) => b.drawNo - a.drawNo)[0];
    } catch (error) {
      // 추정 회차가 아직 공개되지 않은 경우 이전 회차를 확인합니다.
    }
  }

  throw new Error("Could not find latest draw");
}

function isWithinTwoYears(draw) {
  const drawDate = new Date(`${draw.date}T00:00:00+09:00`);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return drawDate >= twoYearsAgo;
}

try {
  const latest = await findLatestDraw();
  const drawMap = new Map();

  for (let cursor = latest.drawNo; cursor >= Math.max(1, latest.drawNo - 120); cursor -= 10) {
    const draws = await fetchDrawWindow(cursor);
    draws.forEach((draw) => {
      if (isWithinTwoYears(draw)) {
        drawMap.set(draw.drawNo, draw);
      }
    });
  }

  const results = [...drawMap.values()].sort((a, b) => b.drawNo - a.drawNo);
  const currentLatest = results[0] || latest;

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({
      source: apiBase,
      generatedAt: new Date().toISOString(),
      latest: currentLatest,
      results,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Updated ${results.length} lotto draw results. Latest draw: ${currentLatest.drawNo}`);
} catch (error) {
  console.warn(`Could not update lotto results cache: ${error.message}`);
  console.warn("Keeping the existing data/lotto-results.json file.");
}
