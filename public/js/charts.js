const CHART_JS_URL =
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";

let chartJsPromise = null;

function loadChartJs() {
  if (!chartJsPromise) {
    chartJsPromise = import(CHART_JS_URL).then(
      (module) => module.Chart ?? module.default
    );
  }

  return chartJsPromise;
}

const PALETTE = [
  "#b45a3c",
  "#3d5a4c",
  "#c4922a",
  "#4a7c59",
  "#7a6a53",
  "#8c6d9e",
  "#4f7c8a",
];

function formatAxisValue(minorAmount, currency, decimalPlaces) {
  const major = minorAmount / 10 ** decimalPlaces;

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

function monthLabel(month) {
  const [year, monthNumber] = month.split("-");
  const short = String(Number(monthNumber)).padStart(2, "0");

  return `${short}/${year.slice(2)}`;
}

async function getContext(canvas) {
  const Chart = await loadChartJs();

  const existing = Chart.getChart(canvas);

  if (existing) {
    existing.destroy();
  }

  return { Chart, ctx: canvas.getContext("2d") };
}

export async function renderTrendChart(
  canvas,
  monthly,
  currency,
  decimalPlaces
) {
  const { Chart, ctx } = await getContext(canvas);

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthly.map((item) => monthLabel(item.month)),
      datasets: [
        {
          label: "Thu nhập",
          data: monthly.map((item) => item.income),
          backgroundColor: "#4a7c59",
          borderRadius: 4,
        },
        {
          label: "Chi tiêu",
          data: monthly.map((item) => item.expense),
          backgroundColor: "#b45a3c",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (item) =>
              `${item.dataset.label}: ${formatAxisValue(
                item.parsed.y,
                currency,
                decimalPlaces
              )}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value) =>
              formatAxisValue(value, currency, decimalPlaces),
          },
        },
      },
    },
  });
}

export async function renderCategoryChart(
  canvas,
  byCategory,
  currency,
  decimalPlaces
) {
  const { Chart, ctx } = await getContext(canvas);

  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: byCategory.map((item) => item.category),
      datasets: [
        {
          data: byCategory.map((item) => item.total),
          backgroundColor: byCategory.map(
            (_, index) => PALETTE[index % PALETTE.length]
          ),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (item) => {
              const value = formatAxisValue(
                item.parsed,
                currency,
                decimalPlaces
              );

              return `${item.label}: ${value}`;
            },
          },
        },
      },
    },
  });
}
