import { mkdir, writeFile } from "node:fs/promises";

const outputPath = new URL("../data/lotto-results.json", import.meta.url);
const apiBase = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

function estimateLatestDrawNo() {
  const firstDrawDate = new Date("2002-12-07T20:45:00+09:00").getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - firstDrawDate;
  return Math.max(1, Math.floor(elapsed / oneWeek) + 1);
}

function normalizeDraw(data) {
  return {
    drawNo: Number(data.drwNo),
    date: data.drwNoDate,
    numbers: [1, 2, 3, 4, 5, 6].map((index) => Number(data[`drwtNo${index}`])),
    bonusNumber: Number(data.bnusNo),
    firstPrizeWinners: Number(data.firstPrzwnerCo || 0),
    firstWinAmount: Number(data.firstWinamnt || 0),
    totalSales: Number(data.totSellamnt || 0),
  };
}

async function fetchDraw(drawNo) {
  const response = await fetch(`${apiBase}${drawNo}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Qonlab-Lotto-Result-Updater/1.0",
    },
  });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Draw ${drawNo} did not return JSON`);
  }

  if (data.returnValue !== "success") {
    throw new Error(`Draw ${drawNo} is not available`);
  }

  return normalizeDraw(data);
}

async function findLatestDraw() {
  const estimated = estimateLatestDrawNo();

  for (let drawNo = estimated + 1; drawNo >= Math.max(1, estimated - 12); drawNo -= 1) {
    try {
      return await fetchDraw(drawNo);
    } catch (error) {
      // 추정 회차가 아직 공개되지 않은 경우 이전 회차를 확인합니다.
    }
  }

  throw new Error("Could not find latest draw");
}

try {
  const latest = await findLatestDraw();
  const results = [];

  for (let drawNo = latest.drawNo; drawNo >= Math.max(1, latest.drawNo - 99); drawNo -= 1) {
    results.push(await fetchDraw(drawNo));
  }

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({
      source: apiBase,
      generatedAt: new Date().toISOString(),
      latest,
      results,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Updated ${results.length} lotto draw results. Latest draw: ${latest.drawNo}`);
} catch (error) {
  console.warn(`Could not update lotto results cache: ${error.message}`);
  console.warn("Keeping the existing data/lotto-results.json file.");
}
