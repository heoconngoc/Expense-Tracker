import {
  renderCategoryChart,
  renderTrendChart,
} from "./js/charts.js";

// ---- State ----
let selectedAccountId = null;
let editingTransactionId = null;
let completingTransfer = null;
let editingAccountId = null;
let editingCategoryId = null;
let editingCurrencyId = null;
let editingGoldHoldingId = null;
let editingGoalId = null;
let contributingGoal = null;
let currentGoldPrice = null;

const accountsById = new Map();
const currenciesById = new Map();

const dialog = document.querySelector("#transaction-dialog");
const transferDialog = document.querySelector("#transfer-dialog");
const completeDialog = document.querySelector("#complete-transfer-dialog");
const accountDialog = document.querySelector("#account-dialog");
const categoryDialog = document.querySelector("#category-dialog");
const currencyDialog = document.querySelector("#currency-dialog");
const goldHoldingDialog = document.querySelector("#gold-holding-dialog");
const goldPriceDialog = document.querySelector("#gold-price-dialog");
const goalDialog = document.querySelector("#goal-dialog");
const contributionDialog = document.querySelector("#contribution-dialog");

const form = document.querySelector("#transaction-form");
const transferForm = document.querySelector("#transfer-form");
const completeForm = document.querySelector("#complete-transfer-form");
const accountForm = document.querySelector("#account-form");
const categoryForm = document.querySelector("#category-form");
const currencyForm = document.querySelector("#currency-form");
const goldHoldingForm = document.querySelector("#gold-holding-form");
const goldPriceForm = document.querySelector("#gold-price-form");
const goalForm = document.querySelector("#goal-form");
const contributionForm = document.querySelector("#contribution-form");

const monthFilter = document.querySelector("#month-filter");
const currencyFilter = document.querySelector("#currency-filter");

// ---- Helpers ----

function toMinors(value, decimalPlaces) {
  return Math.round(value * 10 ** decimalPlaces);
}

function formatMoney(minorAmount, currencyCode, decimalPlaces) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(minorAmount / 10 ** decimalPlaces);
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setDefaultMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  monthFilter.value = `${year}-${month}`;
}

function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);

  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;

  const nextMonth = new Date(year, monthNumber, 1);

  const endYear = nextMonth.getFullYear();
  const endMonth = String(nextMonth.getMonth() + 1).padStart(2, "0");

  const end = `${endYear}-${endMonth}-01`;

  return { start, end };
}

const TYPE_LABELS = {
  spending: "Chi tiêu",
  savings: "Tiết kiệm",
  gold: "Vàng",
};

function typeLabel(type) {
  return TYPE_LABELS[type] ?? type;
}

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatQuantity(quantity) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 3,
  }).format(quantity);
}

function holdingValueVnd(holding) {
  if (!currentGoldPrice) {
    return null;
  }

  const chi = holding.unit === "luong" ? holding.quantity * 10 : holding.quantity;

  return Math.round((currentGoldPrice.price * chi) / 10);
}

function createEmptyState(title, subtitle = "", buttonText = null) {
  const box = document.createElement("div");
  box.className = "empty-state";

  const heading = document.createElement("strong");
  heading.textContent = title;
  box.append(heading);

  if (subtitle) {
    const text = document.createElement("p");
    text.textContent = subtitle;
    box.append(text);
  }

  if (buttonText) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = buttonText;
    box.append(button);
  }

  return box;
}

// ---- Toast ----

const toast = document.createElement("div");
toast.className = "toast";
document.body.append(toast);

let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
}

async function safe(task) {
  try {
    await task();
  } catch (err) {
    console.error(err);
    showToast(err?.message || "Có lỗi xảy ra khi tải dữ liệu");
  }
}

// ---- Tabs ----

function showTab(name) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${name}`);
  });
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

// ---- Currencies ----

async function loadCurrencies() {
  const response = await fetch("/currencies?active=1");

  if (!response.ok) {
    throw new Error("Failed to load currencies");
  }

  const currencies = await response.json();

  currenciesById.clear();

  for (const currency of currencies) {
    currenciesById.set(currency.id, currency);
  }

  const previous = currencyFilter.value;

  currencyFilter.replaceChildren();

  for (const currency of currencies) {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = currency.code;
    currencyFilter.append(option);
  }

  if (previous) {
    currencyFilter.value = previous;
  }

  const accountCurrency = document.querySelector("#account-currency");
  accountCurrency.replaceChildren();

  for (const currency of currencies) {
    const option = document.createElement("option");
    option.value = currency.id;
    option.textContent = `${currency.code} — ${currency.name}`;
    option.dataset.decimalPlaces = currency.decimalPlaces;
    accountCurrency.append(option);
  }

  const goalCurrency = document.querySelector("#goal-currency");
  goalCurrency.replaceChildren();

  for (const currency of currencies) {
    const option = document.createElement("option");
    option.value = currency.id;
    option.textContent = `${currency.code} — ${currency.name}`;
    option.dataset.decimalPlaces = currency.decimalPlaces;
    goalCurrency.append(option);
  }

  updateAccountBalanceHint();
}

function updateAccountBalanceHint() {
  const option = document.querySelector("#account-currency").selectedOptions[0];
  const decimalPlaces = option ? Number(option.dataset.decimalPlaces) : 2;

  document.querySelector("#account-balance-hint").textContent =
    `Số dư sẽ được lưu bằng đơn vị nhỏ nhất (${decimalPlaces} chữ số thập phân).`;
}

// ---- Categories ----

async function loadCategories() {
  const response = await fetch("/categories");

  if (!response.ok) {
    throw new Error("Failed to load categories");
  }

  const categories = await response.json();

  const select = document.querySelector("#transaction-category");
  select.replaceChildren();

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.append(option);
  }
}

// ---- Account options ----

function fillAccountSelect(select) {
  select.replaceChildren();

  for (const account of accountsById.values()) {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = `${account.name} (${account.currency})`;
    select.append(option);
  }
}

function fillAccountFilter(select) {
  select.replaceChildren();

  const all = document.createElement("option");
  all.value = "";
  all.textContent = "Tất cả";
  select.append(all);

  for (const account of accountsById.values()) {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = `${account.name} (${account.currency})`;
    select.append(option);
  }
}

async function loadAccountOptions() {
  const response = await fetch("/accounts?active=1");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const accounts = await response.json();

  accountsById.clear();

  for (const account of accounts) {
    accountsById.set(account.id, account);
  }

  fillAccountSelect(document.querySelector("#transaction-account"));
  fillAccountSelect(document.querySelector("#transfer-source"));
  fillAccountSelect(document.querySelector("#transfer-destination"));
  fillAccountFilter(document.querySelector("#transaction-filter-account"));
}

// ---- Accounts (dashboard cards) ----

async function loadAccounts() {
  const response = await fetch("/accounts");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const accounts = await response.json();

  const container = document.querySelector("#accounts");
  container.replaceChildren();

  if (accounts.length === 0) {
    const empty = createEmptyState(
      "Chưa có tài khoản nào.",
      "Hãy tạo tài khoản đầu tiên để bắt đầu theo dõi thu chi.",
      "Tạo tài khoản"
    );

    empty.querySelector("button").addEventListener("click", () => {
      openAccountDialog();
    });

    container.append(empty);
    return;
  }

  for (const account of accounts) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "account-card";

    if (account.id === selectedAccountId) {
      card.classList.add("selected");
    }

    if (!account.isActive) {
      card.classList.add("archived");
    }

    const header = document.createElement("div");
    header.className = "account-header";

    const name = document.createElement("strong");
    name.className = "account-name";
    name.textContent = account.name;

    const currency = document.createElement("span");
    currency.className = "account-currency";
    currency.textContent = account.currency;

    header.append(name, currency);

    const balance = document.createElement("div");
    balance.className = "account-balance";
    balance.textContent = formatMoney(
      account.balance,
      account.currency,
      account.decimalPlaces
    );

    card.append(header, balance);

    if (!account.isActive) {
      const badge = document.createElement("span");
      badge.className = "badge badge-archived";
      badge.textContent = "Đã lưu trữ";
      card.append(badge);
    }

    card.addEventListener("click", () => {
      if (selectedAccountId === account.id) {
        selectedAccountId = null;
      } else {
        selectedAccountId = account.id;

        const option = currencyFilter.querySelector(
          `option[value="${account.currency}"]`
        );

        if (option) {
          currencyFilter.value = account.currency;
        }
      }

      refreshDashboard();
    });

    container.append(card);
  }
}

// ---- Transactions ----

function renderTransactionRows(container, transactions) {
  container.replaceChildren();

  for (const transaction of transactions) {
    const row = document.createElement("article");
    row.className = "transaction-row";

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = transaction.name;

    const details = document.createElement("p");
    details.textContent =
      `${transaction.date} · ${transaction.category} · ${transaction.account}`;

    info.append(name, details);

    const actions = document.createElement("div");
    actions.className = "transaction-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button ghost small";
    editButton.textContent = "Sửa";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button danger small";
    deleteButton.textContent = "Xóa";

    actions.append(editButton, deleteButton);

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Xóa "${transaction.name}"?`);

      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(
          `/transactions/${transaction.id}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          throw new Error("Failed to delete transaction");
        }

        await refreshAll();
      } catch (err) {
        console.error(err);
      }
    });

    editButton.addEventListener("click", () => {
      editingTransactionId = transaction.id;

      document.querySelector("#transaction-form-title").textContent = "Sửa giao dịch";
      document.querySelector("#transaction-name").value = transaction.name;
      document.querySelector("#transaction-amount").value = (
        transaction.amount / 10 ** transaction.decimalPlaces
      ).toFixed(transaction.decimalPlaces);
      document.querySelector("#transaction-type").value = transaction.type;
      document.querySelector("#transaction-date").value = transaction.date;
      document.querySelector("#transaction-category").value = transaction.categoryId;
      document.querySelector("#transaction-account").value = transaction.accountId;
      document.querySelector("#transaction-notes").value = transaction.notes ?? "";
      document.querySelector("#form-error").textContent = "";

      dialog.showModal();
    });

    const amount = document.createElement("strong");
    amount.className = `amount ${transaction.type}`;

    const formattedAmount = formatMoney(
      transaction.amount,
      transaction.currency,
      transaction.decimalPlaces
    );

    amount.textContent =
      transaction.type === "income"
        ? `+${formattedAmount}`
        : `-${formattedAmount}`;

    const rightSide = document.createElement("div");
    rightSide.className = "transaction-right";
    rightSide.append(amount, actions);

    row.append(info, rightSide);
    container.append(row);
  }
}

async function loadTransactions() {
  const accountId = document.querySelector("#transaction-filter-account").value;
  const type = document.querySelector("#transaction-filter-type").value;

  const params = new URLSearchParams();

  if (accountId) {
    params.set("accountId", accountId);
  }

  if (type) {
    params.set("type", type);
  }

  const response = await fetch(`/transactions?${params}`);

  if (!response.ok) {
    throw new Error("Failed to load transactions");
  }

  const transactions = await response.json();

  const container = document.querySelector("#transactions");

  if (transactions.length === 0) {
    renderTransactionRows(container, []);
    container.append(
      createEmptyState(
        "Không có giao dịch.",
        'Bấm "+ Giao dịch" để ghi lại khoản thu chi đầu tiên.'
      )
    );
    return;
  }

  renderTransactionRows(container, transactions);
}

async function loadAccountTransactions() {
  const title = document.querySelector("#account-transactions-title");
  const container = document.querySelector("#account-transactions");

  if (!selectedAccountId) {
    title.textContent = "Giao dịch";
    container.replaceChildren();
    container.append(
      createEmptyState(
        "Bấm vào một tài khoản bên trên",
        "Chọn tài khoản để xem lịch sử giao dịch của riêng tài khoản đó."
      )
    );
    return;
  }

  const account = accountsById.get(selectedAccountId);
  title.textContent = account ? `Giao dịch · ${account.name}` : "Giao dịch";

  const month = monthFilter.value;

  if (!month) {
    return;
  }

  const { start, end } = getMonthRange(month);

  const params = new URLSearchParams({
    accountId: selectedAccountId,
    start,
    end,
  });

  const response = await fetch(`/transactions?${params}`);

  if (!response.ok) {
    throw new Error("Failed to load account transactions");
  }

  const transactions = await response.json();

  if (transactions.length === 0) {
    container.replaceChildren();
    container.append(
      createEmptyState(
        "Không có giao dịch trong tháng này.",
        'Bấm "+ Giao dịch" ở tab Giao dịch để thêm.'
      )
    );
    return;
  }

  renderTransactionRows(container, transactions);
}

// ---- Transfers ----

async function loadTransfers() {
  const response = await fetch("/transfers");

  if (!response.ok) {
    throw new Error("Failed to load transfers");
  }

  const transfers = await response.json();

  const container = document.querySelector("#transfers");
  container.replaceChildren();

  if (transfers.length === 0) {
    container.append(
      createEmptyState(
        "Chưa có chuyển khoản nào.",
        'Bấm "+ Chuyển khoản" để di chuyển tiền giữa các tài khoản.'
      )
    );
    return;
  }

  for (const transfer of transfers) {
    const row = document.createElement("article");
    row.className = "transaction-row";

    const info = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent =
      `${transfer.sourceAccount} → ${transfer.destinationAccount}`;

    const sent = formatMoney(
      transfer.sentAmount,
      transfer.sourceCurrency,
      transfer.sourceDecimalPlaces
    );

    const received =
      transfer.receivedAmount === null
        ? "—"
        : formatMoney(
            transfer.receivedAmount,
            transfer.destinationCurrency,
            transfer.destinationDecimalPlaces
          );

    const details = document.createElement("p");
    details.textContent =
      `${transfer.sentDate} · ${sent} → ${received} · tỷ giá ${transfer.exchangeRate}`;

    info.append(title, details);

    const rightSide = document.createElement("div");
    rightSide.className = "transaction-right";

    const badge = document.createElement("span");
    badge.className = `badge ${
      transfer.status === "pending" ? "badge-pending" : "badge-completed"
    }`;

    badge.textContent =
      transfer.status === "pending" ? "Đang chờ" : "Hoàn tất";

    rightSide.append(badge);

    if (transfer.status === "pending") {
      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "button small";
      completeButton.textContent = "Hoàn tất";

      completeButton.addEventListener("click", () => {
        openCompleteTransfer(transfer);
      });

      rightSide.append(completeButton);
    }

    row.append(info, rightSide);
    container.append(row);
  }
}

function openCompleteTransfer(transfer) {
  completingTransfer = transfer;

  document.querySelector("#complete-transfer-info").textContent =
    `${transfer.sourceAccount} → ${transfer.destinationAccount} · ${transfer.sentDate}`;

  completeForm.reset();
  document.querySelector("#complete-received-date").value = getToday();
  document.querySelector("#complete-transfer-error").textContent = "";

  completeDialog.showModal();
}

// ---- Dashboard ----

async function loadDashboard() {
  const month = monthFilter.value;
  const currency = currencyFilter.value;

  if (!month || !currency) {
    return;
  }

  const { start, end } = getMonthRange(month);

  const params = new URLSearchParams({ start, end, currency });

  if (selectedAccountId) {
    params.set("accountId", selectedAccountId);
  }

  const response = await fetch(`/dashboard?${params}`);

  if (!response.ok) {
    throw new Error("Failed to load dashboard");
  }

  const dashboard = await response.json();

  document.querySelector("#income").textContent = formatMoney(
    dashboard.totalIncome,
    dashboard.currency,
    dashboard.decimalPlaces
  );

  document.querySelector("#expense").textContent = formatMoney(
    dashboard.totalExpense,
    dashboard.currency,
    dashboard.decimalPlaces
  );

  document.querySelector("#net").textContent = formatMoney(
    dashboard.net,
    dashboard.currency,
    dashboard.decimalPlaces
  );

  await renderCharts(dashboard);
}

async function renderCharts(dashboard) {
  const trendCanvas = document.querySelector("#trend-chart");
  const categoryCanvas = document.querySelector("#category-chart");

  clearChartFallback(trendCanvas);
  clearChartFallback(categoryCanvas);

  try {
    await renderTrendChart(
      trendCanvas,
      dashboard.monthly,
      dashboard.currency,
      dashboard.decimalPlaces
    );
  } catch (err) {
    console.error("Failed to render trend chart", err);
    showChartFallback(
      trendCanvas,
      `Không vẽ được biểu đồ: ${err?.message || "lỗi không xác định"}`
    );
  }

  try {
    await renderCategoryChart(
      categoryCanvas,
      dashboard.byCategory,
      dashboard.currency,
      dashboard.decimalPlaces
    );
  } catch (err) {
    console.error("Failed to render category chart", err);
    showChartFallback(
      categoryCanvas,
      `Không vẽ được biểu đồ: ${err?.message || "lỗi không xác định"}`
    );
  }
}

function clearChartFallback(canvas) {
  const box = canvas?.parentElement;

  if (!box) {
    return;
  }

  box.querySelector(".chart-fallback")?.remove();
  canvas.hidden = false;
}

function showChartFallback(canvas, message) {
  const box = canvas.parentElement;

  if (!box) {
    return;
  }

  box.querySelector(".chart-fallback")?.remove();

  const note = document.createElement("p");
  note.className = "chart-fallback";
  note.textContent = message;

  canvas.hidden = true;
  box.append(note);
}

function refreshDashboard() {
  return Promise.all([loadAccounts(), loadAccountTransactions(), loadDashboard()]);
}

// ---- Transaction dialog ----

document.querySelector("#add-transaction").addEventListener("click", () => {
  editingTransactionId = null;
  form.reset();

  document.querySelector("#transaction-form-title").textContent = "Thêm giao dịch";
  document.querySelector("#transaction-date").value = getToday();
  document.querySelector("#form-error").textContent = "";

  if (selectedAccountId && accountsById.has(selectedAccountId)) {
    document.querySelector("#transaction-account").value = selectedAccountId;
  }

  dialog.showModal();
});

document.querySelector("#cancel-transaction").addEventListener("click", () => {
  dialog.close();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accountId = Number(document.querySelector("#transaction-account").value);

  if (!accountId) {
    document.querySelector("#form-error").textContent =
      "Chưa có tài khoản nào. Hãy tạo tài khoản trước.";
    return;
  }

  const account = accountsById.get(accountId);
  const decimalPlaces = account ? account.decimalPlaces : 2;

  const transaction = {
    name: document.querySelector("#transaction-name").value.trim(),
    amount: toMinors(
      Number(document.querySelector("#transaction-amount").value),
      decimalPlaces
    ),
    type: document.querySelector("#transaction-type").value,
    date: document.querySelector("#transaction-date").value,
    categoryId: Number(document.querySelector("#transaction-category").value),
    accountId,
    notes: document.querySelector("#transaction-notes").value.trim() || null,
  };

  try {
    const url = editingTransactionId === null ? "/transactions" : `/transactions/${editingTransactionId}`;
    const method = editingTransactionId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được giao dịch");
    }

    form.reset();
    dialog.close();

    await refreshAll();
  } catch (err) {
    document.querySelector("#form-error").textContent = err.message;
  }
});

// ---- Transfer dialog ----

document.querySelector("#add-transfer").addEventListener("click", () => {
  transferForm.reset();
  document.querySelector("#transfer-sent-date").value = getToday();
  document.querySelector("#transfer-error").textContent = "";

  transferDialog.showModal();
});

document.querySelector("#cancel-transfer").addEventListener("click", () => {
  transferDialog.close();
});

transferForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sourceAccountId = Number(document.querySelector("#transfer-source").value);
  const destinationAccountId = Number(document.querySelector("#transfer-destination").value);

  if (!sourceAccountId || !destinationAccountId) {
    document.querySelector("#transfer-error").textContent =
      "Cần ít nhất hai tài khoản để chuyển tiền.";
    return;
  }

  const source = accountsById.get(sourceAccountId);
  const destination = accountsById.get(destinationAccountId);

  const receivedValue = document.querySelector("#transfer-received").value;
  const status = document.querySelector("#transfer-status").value;

  const transfer = {
    sourceAccountId,
    destinationAccountId,
    sentAmount: toMinors(
      Number(document.querySelector("#transfer-sent").value),
      source ? source.decimalPlaces : 2
    ),
    receivedAmount:
      receivedValue === ""
        ? null
        : toMinors(Number(receivedValue), destination ? destination.decimalPlaces : 2),
    exchangeRate: Number(document.querySelector("#transfer-rate").value),
    status,
    sentDate: document.querySelector("#transfer-sent-date").value,
    receivedDate: document.querySelector("#transfer-received-date").value || null,
  };

  try {
    const response = await fetch("/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transfer),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được chuyển khoản");
    }

    transferForm.reset();
    transferDialog.close();

    await refreshAll();
  } catch (err) {
    document.querySelector("#transfer-error").textContent = err.message;
  }
});

// ---- Complete transfer dialog ----

document.querySelector("#cancel-complete-transfer").addEventListener("click", () => {
  completeDialog.close();
});

completeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!completingTransfer) {
    return;
  }

  const transfer = {
    receivedAmount: toMinors(
      Number(document.querySelector("#complete-received").value),
      completingTransfer.destinationDecimalPlaces
    ),
    receivedDate: document.querySelector("#complete-received-date").value,
  };

  try {
    const response = await fetch(`/transfers/${completingTransfer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transfer),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không hoàn tất được chuyển khoản");
    }

    completeForm.reset();
    completeDialog.close();
    completingTransfer = null;

    await refreshAll();
  } catch (err) {
    document.querySelector("#complete-transfer-error").textContent = err.message;
  }
});

// ---- Account dialog ----

function updateAccountFormVisibility() {
  const balanceField = document.querySelector("#account-balance-field");
  const type = document.querySelector("#account-type").value;

  if (editingAccountId !== null) {
    balanceField.hidden = true;
    return;
  }

  balanceField.hidden = type === "gold";
}

function openAccountDialog(account = null) {
  editingAccountId = account ? account.id : null;

  document.querySelector("#account-form-title").textContent =
    account ? "Sửa tài khoản" : "Thêm tài khoản";

  accountForm.reset();
  document.querySelector("#account-error").textContent = "";

  const balanceField = document.querySelector("#account-balance-field");

  if (account) {
    document.querySelector("#account-name").value = account.name;
    document.querySelector("#account-currency").value = account.currencyId;
    document.querySelector("#account-type").value = account.type ?? "spending";
    document.querySelector("#account-active").value = account.isActive ? "1" : "0";
    balanceField.hidden = true;
  } else {
    document.querySelector("#account-initial-balance").value = "0";
    document.querySelector("#account-type").value = "spending";
    document.querySelector("#account-active").value = "1";
    balanceField.hidden = false;
  }

  updateAccountBalanceHint();
  updateAccountFormVisibility();
  accountDialog.showModal();
}

document.querySelectorAll('[data-action="add-account"]').forEach((button) => {
  button.addEventListener("click", () => openAccountDialog());
});

document.querySelector("#cancel-account").addEventListener("click", () => {
  accountDialog.close();
});

document.querySelector("#account-currency").addEventListener("change", updateAccountBalanceHint);
document.querySelector("#account-type").addEventListener("change", updateAccountFormVisibility);

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const account = {
    name: document.querySelector("#account-name").value.trim(),
    currencyId: Number(document.querySelector("#account-currency").value),
    type: document.querySelector("#account-type").value,
    isActive: document.querySelector("#account-active").value === "1",
  };

  if (editingAccountId === null) {
    const currencyId = account.currencyId;

    const option = Array.from(
      document.querySelector("#account-currency").options
    ).find((item) => Number(item.value) === currencyId);

    const decimalPlaces = option ? Number(option.dataset.decimalPlaces) : 2;

    account.initialBalance = toMinors(
      Number(document.querySelector("#account-initial-balance").value || 0),
      decimalPlaces
    );
  }

  try {
    const url = editingAccountId === null ? "/accounts" : `/accounts/${editingAccountId}`;
    const method = editingAccountId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được tài khoản");
    }

    accountDialog.close();
    await refreshAll();
  } catch (err) {
    document.querySelector("#account-error").textContent = err.message;
  }
});

// ---- Category dialog ----

function openCategoryDialog(category = null) {
  editingCategoryId = category ? category.id : null;

  document.querySelector("#category-form-title").textContent =
    category ? "Sửa danh mục" : "Thêm danh mục";

  categoryForm.reset();
  document.querySelector("#category-error").textContent = "";

  if (category) {
    document.querySelector("#category-name").value = category.name;
    document.querySelector("#category-active").value = category.isActive ? "1" : "0";
  } else {
    document.querySelector("#category-active").value = "1";
  }

  categoryDialog.showModal();
}

document.querySelectorAll('[data-action="add-category"]').forEach((button) => {
  button.addEventListener("click", () => openCategoryDialog());
});

document.querySelector("#cancel-category").addEventListener("click", () => {
  categoryDialog.close();
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const category = {
    name: document.querySelector("#category-name").value.trim(),
    isActive: document.querySelector("#category-active").value === "1",
  };

  try {
    const url = editingCategoryId === null ? "/categories" : `/categories/${editingCategoryId}`;
    const method = editingCategoryId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được danh mục");
    }

    categoryDialog.close();
    await refreshAll();
  } catch (err) {
    document.querySelector("#category-error").textContent = err.message;
  }
});

// ---- Currency dialog ----

function openCurrencyDialog(currency = null) {
  editingCurrencyId = currency ? currency.id : null;

  document.querySelector("#currency-form-title").textContent =
    currency ? "Sửa tiền tệ" : "Thêm tiền tệ";

  currencyForm.reset();
  document.querySelector("#currency-error").textContent = "";

  const codeField = document.querySelector("#currency-code-field");
  const decimalField = document.querySelector("#currency-decimal-field");

  if (currency) {
    document.querySelector("#currency-name").value = currency.name;
    document.querySelector("#currency-symbol").value = currency.symbol;
    document.querySelector("#currency-active").value = currency.isActive ? "1" : "0";
    codeField.hidden = true;
    decimalField.hidden = true;
  } else {
    document.querySelector("#currency-active").value = "1";
    codeField.hidden = false;
    decimalField.hidden = false;
  }

  currencyDialog.showModal();
}

document.querySelectorAll('[data-action="add-currency"]').forEach((button) => {
  button.addEventListener("click", () => openCurrencyDialog());
});

document.querySelector("#cancel-currency").addEventListener("click", () => {
  currencyDialog.close();
});

currencyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currency = {
    name: document.querySelector("#currency-name").value.trim(),
    symbol: document.querySelector("#currency-symbol").value.trim(),
    isActive: document.querySelector("#currency-active").value === "1",
  };

  if (editingCurrencyId === null) {
    currency.code = document.querySelector("#currency-code").value.trim();
    currency.decimalPlaces = Number(
      document.querySelector("#currency-decimal-places").value
    );
  }

  try {
    const url = editingCurrencyId === null ? "/currencies" : `/currencies/${editingCurrencyId}`;
    const method = editingCurrencyId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currency),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được tiền tệ");
    }

    currencyDialog.close();
    await refreshAll();
  } catch (err) {
    document.querySelector("#currency-error").textContent = err.message;
  }
});

// ---- Manage lists ----

function createManageRow({ title, detail, archived = false, onEdit }) {
  const row = document.createElement("div");
  row.className = "manage-row";

  const info = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = title;

  const detailElement = document.createElement("p");
  detailElement.textContent = detail;

  info.append(name, detailElement);

  const actions = document.createElement("div");
  actions.className = "manage-actions";

  if (archived) {
    const badge = document.createElement("span");
    badge.className = "badge badge-archived";
    badge.textContent = "Đã lưu trữ";
    actions.append(badge);
  }

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "button ghost small";
  editButton.textContent = "Sửa";
  editButton.addEventListener("click", onEdit);

  actions.append(editButton);

  row.append(info, actions);
  return row;
}

async function loadManageAccounts() {
  const response = await fetch("/accounts");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const accounts = await response.json();

  const container = document.querySelector("#manage-accounts");
  container.replaceChildren();

  if (accounts.length === 0) {
    container.append(createEmptyState("Chưa có tài khoản."));
    return;
  }

  for (const account of accounts) {
    container.append(
      createManageRow({
        title: `${account.name} (${account.currency})`,
        detail: formatMoney(account.balance, account.currency, account.decimalPlaces),
        archived: !account.isActive,
        onEdit: () => openAccountDialog(account),
      })
    );
  }
}

async function loadManageCategories() {
  const response = await fetch("/categories?all=1");

  if (!response.ok) {
    throw new Error("Failed to load categories");
  }

  const categories = await response.json();

  const container = document.querySelector("#manage-categories");
  container.replaceChildren();

  if (categories.length === 0) {
    container.append(createEmptyState("Chưa có danh mục."));
    return;
  }

  for (const category of categories) {
    container.append(
      createManageRow({
        title: category.name,
        detail: category.isActive ? "Đang dùng" : "Đã lưu trữ",
        archived: !category.isActive,
        onEdit: () => openCategoryDialog(category),
      })
    );
  }
}

async function loadManageCurrencies() {
  const response = await fetch("/currencies?all=1");

  if (!response.ok) {
    throw new Error("Failed to load currencies");
  }

  const currencies = await response.json();

  const container = document.querySelector("#manage-currencies");
  container.replaceChildren();

  if (currencies.length === 0) {
    container.append(createEmptyState("Chưa có tiền tệ."));
    return;
  }

  for (const currency of currencies) {
    container.append(
      createManageRow({
        title: `${currency.code} — ${currency.name}`,
        detail: `Ký hiệu ${currency.symbol} · ${currency.decimalPlaces} chữ số thập phân`,
        archived: !currency.isActive,
        onEdit: () => openCurrencyDialog(currency),
      })
    );
  }
}

// ---- Assets tab ----

function makeButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function loadAssetsTab() {
  await loadGoldPrice();

  await Promise.all([
    loadAssets(),
    loadGoldHoldings(),
    loadExchangeRates(),
  ]);
}

async function loadGoldPrice() {
  try {
    const response = await fetch("/gold-prices/current");

    if (!response.ok) {
      throw new Error("Gold price unavailable");
    }

    currentGoldPrice = await response.json();
  } catch {
    currentGoldPrice = null;
  }

  renderGoldPrice();
}

function renderGoldPrice() {
  const value = document.querySelector("#gold-price-value");
  const meta = document.querySelector("#gold-price-meta");

  if (!currentGoldPrice) {
    value.textContent = "Chưa có giá";
    meta.textContent = "Bấm “Nhập tay” để đặt giá vàng.";
    return;
  }

  value.textContent = `${formatVnd(currentGoldPrice.price)} /lượng`;

  const sources = {
    "giavang.now": "Tự động",
    manual: "Nhập tay",
    cache: "Bản lưu",
  };

  const label = sources[currentGoldPrice.source] ?? currentGoldPrice.source;
  const when = currentGoldPrice.fetchedAt
    ? new Date(currentGoldPrice.fetchedAt).toLocaleString("vi-VN")
    : "";

  meta.textContent = when ? `${label} · ${when}` : label;
}

async function loadAssets() {
  let assets;

  try {
    const response = await fetch("/assets");

    if (!response.ok) {
      throw new Error("Failed to load assets");
    }

    assets = await response.json();
  } catch (err) {
    console.error(err);

    for (const id of ["#total-assets", "#assets-total"]) {
      document.querySelector(id).textContent = "—";
    }

    document.querySelector("#assets-breakdown").replaceChildren();
    document.querySelector("#assets-groups-summary").replaceChildren();
    document.querySelector("#asset-accounts").replaceChildren();
    return;
  }

  const total = formatVnd(assets.total);

  document.querySelector("#total-assets").textContent = total;
  document.querySelector("#assets-total").textContent = total;

  renderBreakdown(document.querySelector("#assets-breakdown"), assets);
  renderBreakdown(document.querySelector("#assets-groups-summary"), assets);
  renderAssetAccounts(assets);
}

function renderBreakdown(container, assets) {
  container.replaceChildren();

  for (const type of ["spending", "savings", "gold"]) {
    const hasAccounts = assets.accounts.some(
      (account) => account.type === type
    );

    if (!hasAccounts) {
      continue;
    }

    const chip = document.createElement("span");
    chip.className = `chip ${type}`;

    const label = document.createElement("span");
    label.textContent = typeLabel(type);

    const amount = document.createElement("strong");
    amount.textContent = formatVnd(assets.byType[type] ?? 0);

    chip.append(label, amount);
    container.append(chip);
  }

  if (assets.missingRates.length > 0) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `Thiếu tỷ giá: ${assets.missingRates.join(", ")}`;
    container.append(chip);
  }
}

function assetAccountRow(account) {
  const row = document.createElement("div");
  row.className = "manage-row";

  const info = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = account.name;

  const detail = document.createElement("p");

  if (account.type === "gold") {
    detail.textContent =
      account.valueVnd === null
        ? "Chưa có giá vàng"
        : formatVnd(account.valueVnd);
  } else {
    const balance = formatMoney(
      account.balance,
      account.currency,
      account.decimalPlaces
    );

    detail.textContent =
      account.valueVnd === null
        ? `${balance} · thiếu tỷ giá`
        : `${balance} · ${formatVnd(account.valueVnd)}`;
  }

  info.append(name, detail);
  row.append(info);

  return row;
}

function renderAssetAccounts(assets) {
  const container = document.querySelector("#asset-accounts");
  container.replaceChildren();

  if (assets.accounts.length === 0) {
    container.append(createEmptyState("Chưa có tài khoản nào."));
    return;
  }

  for (const type of ["spending", "savings", "gold"]) {
    const list = assets.accounts.filter(
      (account) => account.type === type
    );

    if (list.length === 0) {
      continue;
    }

    const heading = document.createElement("p");
    heading.className = "eyebrow";
    heading.textContent = typeLabel(type);
    container.append(heading);

    for (const account of list) {
      container.append(assetAccountRow(account));
    }
  }
}

// ---- Gold holdings ----

async function loadGoldHoldings() {
  const response = await fetch("/gold-holdings");

  if (!response.ok) {
    throw new Error("Failed to load gold holdings");
  }

  const holdings = await response.json();

  const container = document.querySelector("#gold-holdings");
  container.replaceChildren();

  if (holdings.length === 0) {
    container.append(
      createEmptyState(
        "Chưa ghi nhận vàng nào.",
        "Thêm số vàng đang giữ để tính vào tổng tài sản."
      )
    );
    return;
  }

  for (const holding of holdings) {
    const row = document.createElement("div");
    row.className = "manage-row";

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.className = "holding-quantity";
    name.textContent = `${formatQuantity(holding.quantity)} ${
      holding.unit === "luong" ? "lượng" : "chỉ"
    }`;

    const detail = document.createElement("p");
    const parts = [holding.accountName];
    const value = holdingValueVnd(holding);

    if (value !== null) {
      parts.push(formatVnd(value));
    }

    if (holding.note) {
      parts.push(holding.note);
    }

    detail.textContent = parts.join(" · ");

    info.append(name, detail);

    const actions = document.createElement("div");
    actions.className = "manage-actions";

    actions.append(
      makeButton("Sửa", "button ghost small", () =>
        openGoldHoldingDialog(holding)
      ),
      makeButton("Xóa", "button danger small", async () => {
        if (!window.confirm(`Xóa ${formatQuantity(holding.quantity)} ${
          holding.unit === "luong" ? "lượng" : "chỉ"
        } vàng?`)) {
          return;
        }

        try {
          const response = await fetch(`/gold-holdings/${holding.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete holding");
          }

          await refreshAll();
        } catch (err) {
          console.error(err);
        }
      })
    );

    row.append(info, actions);
    container.append(row);
  }
}

function fillGoldAccountSelect(select, selectedId) {
  select.replaceChildren();

  for (const account of accountsById.values()) {
    if (account.type !== "gold") {
      continue;
    }

    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = `${account.name} (${account.currency})`;
    select.append(option);
  }

  if (selectedId) {
    select.value = selectedId;
  }
}

function openGoldHoldingDialog(holding = null) {
  editingGoldHoldingId = holding ? holding.id : null;

  document.querySelector("#gold-holding-form-title").textContent =
    holding ? "Sửa vàng" : "Thêm vàng";

  goldHoldingForm.reset();
  document.querySelector("#gold-holding-error").textContent = "";

  fillGoldAccountSelect(
    document.querySelector("#gold-holding-account"),
    holding?.accountId ?? null
  );

  if (holding) {
    document.querySelector("#gold-holding-quantity").value = holding.quantity;
    document.querySelector("#gold-holding-unit").value = holding.unit;
    document.querySelector("#gold-holding-note").value = holding.note ?? "";
  } else {
    document.querySelector("#gold-holding-unit").value = "luong";
  }

  goldHoldingDialog.showModal();
}

document.querySelector("#add-gold-holding").addEventListener("click", () => {
  const hasGoldAccount = [...accountsById.values()].some(
    (account) => account.type === "gold"
  );

  if (!hasGoldAccount) {
    window.alert(
      "Hãy tạo một tài khoản loại “Vàng” trong tab Quản lý trước."
    );
    return;
  }

  openGoldHoldingDialog();
});

document
  .querySelector("#cancel-gold-holding")
  .addEventListener("click", () => {
    goldHoldingDialog.close();
  });

goldHoldingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const holding = {
    accountId: Number(
      document.querySelector("#gold-holding-account").value
    ),
    quantity: Number(
      document.querySelector("#gold-holding-quantity").value
    ),
    unit: document.querySelector("#gold-holding-unit").value,
    note: document.querySelector("#gold-holding-note").value.trim() || null,
  };

  try {
    const url =
      editingGoldHoldingId === null
        ? "/gold-holdings"
        : `/gold-holdings/${editingGoldHoldingId}`;

    const method = editingGoldHoldingId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(holding),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được vàng");
    }

    goldHoldingDialog.close();
    await refreshAll();
  } catch (err) {
    document.querySelector("#gold-holding-error").textContent = err.message;
  }
});

// ---- Gold price ----

document.querySelector("#refresh-gold-price").addEventListener("click", async () => {
  try {
    const response = await fetch("/gold-prices/refresh", { method: "POST" });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Không lấy được giá vàng");
    }

    currentGoldPrice = await response.json();
    renderGoldPrice();
    await loadAssets();
  } catch (err) {
    window.alert(err.message);
  }
});

document.querySelector("#edit-gold-price").addEventListener("click", async () => {
  goldPriceForm.reset();
  document.querySelector("#gold-price-error").textContent = "";

  try {
    const response = await fetch("/settings");

    if (response.ok) {
      const settings = await response.json();

      if (settings.manualGoldPriceVndPerLuong) {
        document.querySelector("#gold-price-input").value =
          settings.manualGoldPriceVndPerLuong;
      } else if (currentGoldPrice) {
        document.querySelector("#gold-price-input").value =
          currentGoldPrice.price;
      }
    }
  } catch (err) {
    console.error(err);
  }

  goldPriceDialog.showModal();
});

document.querySelector("#cancel-gold-price").addEventListener("click", () => {
  goldPriceDialog.close();
});

goldPriceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/settings/gold-price", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(document.querySelector("#gold-price-input").value),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được giá vàng");
    }

    goldPriceDialog.close();
    await loadAssetsTab();
  } catch (err) {
    document.querySelector("#gold-price-error").textContent = err.message;
  }
});

document.querySelector("#clear-gold-price").addEventListener("click", async () => {
  try {
    await fetch("/settings/gold-price", { method: "DELETE" });
    goldPriceDialog.close();
    await loadAssetsTab();
  } catch (err) {
    console.error(err);
  }
});

// ---- Exchange rates ----

async function loadExchangeRates() {
  const response = await fetch("/exchange-rates");

  if (!response.ok) {
    throw new Error("Failed to load exchange rates");
  }

  const rates = await response.json();

  const container = document.querySelector("#exchange-rates");
  container.replaceChildren();

  for (const rate of rates) {
    if (rate.code === "VND") {
      continue;
    }

    const row = document.createElement("div");
    row.className = "manage-row exchange-row";

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = `1 ${rate.code} → VND`;

    const detail = document.createElement("p");
    const when = rate.updatedAt ? ` · ${rate.updatedAt}` : "";
    detail.textContent = `${rate.source ?? "chưa có"}${when}`;

    info.append(name, detail);

    const actions = document.createElement("div");
    actions.className = "manage-actions";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0.000001";
    input.step = "any";
    input.value = rate.rateToVnd || "";
    input.setAttribute("aria-label", `Tỷ giá ${rate.code}`);

    const save = makeButton("Lưu", "button ghost small", async () => {
      try {
        const response = await fetch(`/exchange-rates/${rate.currencyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rateToVnd: Number(input.value) }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Không lưu được tỷ giá");
        }

        await loadAssetsTab();
      } catch (err) {
        window.alert(err.message);
      }
    });

    actions.append(input, save);
    row.append(info, actions);
    container.append(row);
  }

  if (container.childElementCount === 0) {
    container.append(
      createEmptyState(
        "Chưa có tiền tệ cần tỷ giá.",
        "Chỉ cần tỷ giá cho các loại tiền khác VND."
      )
    );
  }
}

document
  .querySelector("#refresh-exchange-rates")
  .addEventListener("click", async () => {
    try {
      const response = await fetch("/exchange-rates/refresh", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Không lấy được tỷ giá");
      }

      await loadAssetsTab();
    } catch (err) {
      window.alert(err.message);
    }
  });

document.querySelector("#refresh-assets").addEventListener("click", () => {
  loadAssetsTab();
});

// ---- Savings goals ----

async function loadGoals() {
  const response = await fetch("/savings-goals?includeArchived=1");

  if (!response.ok) {
    throw new Error("Failed to load goals");
  }

  const goals = await response.json();

  const container = document.querySelector("#goals");
  container.replaceChildren();

  if (goals.length === 0) {
    const empty = createEmptyState(
      "Chưa có mục tiêu nào.",
      "Bấm “Tạo mục tiêu” để bắt đầu tiết kiệm có kế hoạch.",
      "Tạo mục tiêu"
    );

    empty.querySelector("button").addEventListener("click", () => {
      openGoalDialog();
    });

    container.append(empty);
    return;
  }

  const contributions = await Promise.all(
    goals.map((goal) =>
      fetch(`/savings-goals/${goal.id}/contributions`)
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => [])
    )
  );

  goals.forEach((goal, index) => {
    container.append(goalCard(goal, contributions[index]));
  });
}

function goalCard(goal, contributions) {
  const card = document.createElement("article");
  card.className = "goal-card";

  if (goal.isArchived) {
    card.classList.add("archived");
  }

  const header = document.createElement("div");
  header.className = "goal-header";

  const titleWrap = document.createElement("div");

  const title = document.createElement("h3");
  title.className = "goal-title";
  title.textContent = goal.name;

  const subtitle = document.createElement("p");
  subtitle.className = "goal-subtitle";
  const percent = Math.round(goal.progress * 100);
  subtitle.textContent = `${percent}%${
    goal.deadline ? ` · hạn ${goal.deadline}` : ""
  }`;

  titleWrap.append(title, subtitle);

  const actions = document.createElement("div");
  actions.className = "goal-actions";

  actions.append(
    makeButton("Đóng góp", "button small", () =>
      openContributionDialog(goal)
    ),
    makeButton("Sửa", "button ghost small", () => openGoalDialog(goal)),
    makeButton("Xóa", "button danger small", async () => {
      if (!window.confirm(`Xóa mục tiêu "${goal.name}"?`)) {
        return;
      }

      try {
        const response = await fetch(`/savings-goals/${goal.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete goal");
        }

        await refreshAll();
      } catch (err) {
        console.error(err);
      }
    })
  );

  header.append(titleWrap, actions);

  const progress = document.createElement("div");
  progress.className = "goal-progress";

  const bar = document.createElement("div");
  bar.className = "goal-progress-bar";
  bar.style.width = `${Math.min(100, percent)}%`;
  progress.append(bar);

  const meta = document.createElement("div");
  meta.className = "goal-meta";

  const left = document.createElement("span");
  left.textContent = `${formatMoney(
    goal.totalContributed,
    goal.currency,
    goal.decimalPlaces
  )} / ${formatMoney(goal.targetAmount, goal.currency, goal.decimalPlaces)}`;

  const right = document.createElement("span");
  right.textContent =
    goal.remaining > 0
      ? `còn ${formatMoney(goal.remaining, goal.currency, goal.decimalPlaces)}`
      : "Đã đạt";

  meta.append(left, right);

  card.append(header, progress, meta);

  if (contributions.length > 0) {
    const list = document.createElement("div");
    list.className = "goal-contributions";

    for (const contribution of contributions) {
      const row = document.createElement("div");
      row.className = "goal-contribution";

      const label = document.createElement("span");
      label.textContent = `${contribution.contributedAt}${
        contribution.note ? ` · ${contribution.note}` : ""
      }`;

      const rightWrap = document.createElement("span");

      const amount = document.createElement("span");
      amount.textContent = formatMoney(
        contribution.amount,
        goal.currency,
        goal.decimalPlaces
      );

      rightWrap.append(
        amount,
        makeButton("×", "button danger small", async () => {
          try {
            const response = await fetch(
              `/savings-goals/contributions/${contribution.id}`,
              { method: "DELETE" }
            );

            if (!response.ok) {
              throw new Error("Failed to delete contribution");
            }

            await refreshAll();
          } catch (err) {
            console.error(err);
          }
        })
      );

      row.append(label, rightWrap);
      list.append(row);
    }

    card.append(list);
  }

  return card;
}

function openGoalDialog(goal = null) {
  editingGoalId = goal ? goal.id : null;

  document.querySelector("#goal-form-title").textContent =
    goal ? "Sửa mục tiêu" : "Thêm mục tiêu";

  goalForm.reset();
  document.querySelector("#goal-error").textContent = "";

  if (goal) {
    document.querySelector("#goal-name").value = goal.name;
    document.querySelector("#goal-target").value = (
      goal.targetAmount /
      10 ** goal.decimalPlaces
    ).toFixed(goal.decimalPlaces);
    document.querySelector("#goal-currency").value = goal.currencyId;
    document.querySelector("#goal-deadline").value = goal.deadline ?? "";
    document.querySelector("#goal-archived").value = goal.isArchived ? "1" : "0";
  } else {
    document.querySelector("#goal-archived").value = "0";

    const match = [...document.querySelector("#goal-currency").options].find(
      (option) =>
        currenciesById.get(Number(option.value))?.code === currencyFilter.value
    );

    if (match) {
      document.querySelector("#goal-currency").value = match.value;
    }
  }

  goalDialog.showModal();
}

document.querySelector("#add-goal").addEventListener("click", () => {
  openGoalDialog();
});

document.querySelector("#cancel-goal").addEventListener("click", () => {
  goalDialog.close();
});

goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currencyId = Number(document.querySelector("#goal-currency").value);
  const currency = currenciesById.get(currencyId);
  const decimalPlaces = currency ? currency.decimalPlaces : 2;

  const goal = {
    name: document.querySelector("#goal-name").value.trim(),
    targetAmount: toMinors(
      Number(document.querySelector("#goal-target").value),
      decimalPlaces
    ),
    currencyId,
    deadline: document.querySelector("#goal-deadline").value || null,
    isArchived: document.querySelector("#goal-archived").value === "1",
  };

  try {
    const url =
      editingGoalId === null
        ? "/savings-goals"
        : `/savings-goals/${editingGoalId}`;

    const method = editingGoalId === null ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goal),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được mục tiêu");
    }

    goalDialog.close();
    await refreshAll();
  } catch (err) {
    document.querySelector("#goal-error").textContent = err.message;
  }
});

function openContributionDialog(goal) {
  contributingGoal = goal;

  contributionForm.reset();
  document.querySelector("#contribution-error").textContent = "";
  document.querySelector("#contribution-goal-info").textContent = `${
    goal.name
  } · mục tiêu ${formatMoney(
    goal.targetAmount,
    goal.currency,
    goal.decimalPlaces
  )}`;
  document.querySelector("#contribution-date").value = getToday();

  contributionDialog.showModal();
}

document.querySelector("#cancel-contribution").addEventListener("click", () => {
  contributionDialog.close();
});

contributionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!contributingGoal) {
    return;
  }

  const amount = toMinors(
    Number(document.querySelector("#contribution-amount").value),
    contributingGoal.decimalPlaces
  );

  try {
    const response = await fetch(
      `/savings-goals/${contributingGoal.id}/contributions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note: document.querySelector("#contribution-note").value.trim() || null,
          contributedAt:
            document.querySelector("#contribution-date").value || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không lưu được đóng góp");
    }

    contributionDialog.close();
    contributingGoal = null;
    await refreshAll();
  } catch (err) {
    document.querySelector("#contribution-error").textContent = err.message;
  }
});

// ---- Transaction suggestions ----

async function loadSuggestions() {
  try {
    const response = await fetch("/transactions");

    if (!response.ok) {
      throw new Error("Failed to load suggestions");
    }

    const transactions = await response.json();

    const names = [
      ...new Set(
        transactions.map((transaction) => transaction.name).filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "vi"));

    const datalist = document.querySelector("#transaction-name-options");
    datalist.replaceChildren();

    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      datalist.append(option);
    }
  } catch (err) {
    console.error(err);
  }
}

// ---- Data export / import ----

document.querySelector("#export-json").addEventListener("click", async () => {
  try {
    const response = await fetch("/backup");

    if (!response.ok) {
      throw new Error("Không xuất được dữ liệu");
    }

    const blob = new Blob([await response.text()], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-backup-${getToday()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    window.alert(err.message);
  }
});

document.querySelector("#import-json").addEventListener("click", () => {
  document.querySelector("#import-json-file").click();
});

document
  .querySelector("#import-json-file")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Nhập dữ liệu sẽ thay thế TOÀN BỘ dữ liệu hiện tại. Tiếp tục?"
    );

    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      const payload = JSON.parse(await file.text());

      const response = await fetch("/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không nhập được dữ liệu");
      }

      await refreshAll();
      window.alert("Đã nhập dữ liệu.");
    } catch (err) {
      window.alert(err.message);
    }

    event.target.value = "";
  });

// ---- Filters ----

monthFilter.addEventListener("change", () => {
  refreshDashboard();
  loadAccountTransactions();
});

currencyFilter.addEventListener("change", () => {
  if (selectedAccountId) {
    selectedAccountId = null;
  }
  refreshDashboard();
});

document.querySelector("#transaction-filter-account").addEventListener("change", loadTransactions);
document.querySelector("#transaction-filter-type").addEventListener("change", loadTransactions);

// ---- Refresh all ----

async function refreshAll() {
  await Promise.all([
    safe(loadCurrencies),
    safe(loadAccounts),
    safe(loadAccountOptions),
    safe(loadCategories),
    safe(loadTransactions),
    safe(loadDashboard),
    safe(loadAccountTransactions),
    safe(loadTransfers),
    safe(loadManageAccounts),
    safe(loadManageCategories),
    safe(loadManageCurrencies),
    safe(loadAssetsTab),
    safe(loadGoals),
    safe(loadSuggestions),
  ]);
}

// ---- Init ----

async function initialize() {
  try {
    setDefaultMonth();

    await loadCurrencies();

    await Promise.all([
      safe(loadAccounts),
      safe(loadAccountOptions),
      safe(loadCategories),
      safe(loadTransactions),
      safe(loadDashboard),
      safe(loadAccountTransactions),
      safe(loadTransfers),
      safe(loadManageAccounts),
      safe(loadManageCategories),
      safe(loadManageCurrencies),
      safe(loadAssetsTab),
      safe(loadGoals),
      safe(loadSuggestions),
    ]);
  } catch (err) {
    console.error(err);
    showToast("Không khởi động được ứng dụng");
  }
}

initialize();