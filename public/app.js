// ---- State ----
let selectedAccountId = null;
let editingTransactionId = null;
let completingTransfer = null;
let editingAccountId = null;
let editingCategoryId = null;
let editingCurrencyId = null;

const accountsById = new Map();

const dialog = document.querySelector("#transaction-dialog");
const transferDialog = document.querySelector("#transfer-dialog");
const completeDialog = document.querySelector("#complete-transfer-dialog");
const accountDialog = document.querySelector("#account-dialog");
const categoryDialog = document.querySelector("#category-dialog");
const currencyDialog = document.querySelector("#currency-dialog");

const form = document.querySelector("#transaction-form");
const transferForm = document.querySelector("#transfer-form");
const completeForm = document.querySelector("#complete-transfer-form");
const accountForm = document.querySelector("#account-form");
const categoryForm = document.querySelector("#category-form");
const currencyForm = document.querySelector("#currency-form");

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
    document.querySelector("#account-active").value = account.isActive ? "1" : "0";
    balanceField.hidden = true;
  } else {
    document.querySelector("#account-initial-balance").value = "0";
    document.querySelector("#account-active").value = "1";
    balanceField.hidden = false;
  }

  updateAccountBalanceHint();
  accountDialog.showModal();
}

document.querySelectorAll('[data-action="add-account"]').forEach((button) => {
  button.addEventListener("click", () => openAccountDialog());
});

document.querySelector("#cancel-account").addEventListener("click", () => {
  accountDialog.close();
});

document.querySelector("#account-currency").addEventListener("change", updateAccountBalanceHint);

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const account = {
    name: document.querySelector("#account-name").value.trim(),
    currencyId: Number(document.querySelector("#account-currency").value),
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
    loadCurrencies(),
    loadAccounts(),
    loadAccountOptions(),
    loadCategories(),
    loadTransactions(),
    loadDashboard(),
    loadAccountTransactions(),
    loadTransfers(),
    loadManageAccounts(),
    loadManageCategories(),
    loadManageCurrencies(),
  ]);
}

// ---- Init ----

async function initialize() {
  try {
    setDefaultMonth();

    await loadCurrencies();

    await Promise.all([
      loadAccounts(),
      loadAccountOptions(),
      loadCategories(),
      loadTransactions(),
      loadDashboard(),
      loadAccountTransactions(),
      loadTransfers(),
      loadManageAccounts(),
      loadManageCategories(),
      loadManageCurrencies(),
    ]);
  } catch (err) {
    console.error(err);
  }
}

initialize();