let editingTransactionId = null;
let completingTransfer = null;

const accountsById = new Map();

const dialog =
  document.querySelector("#transaction-dialog");

const transferDialog =
  document.querySelector("#transfer-dialog");

const completeDialog =
  document.querySelector("#complete-transfer-dialog");

const addButton =
  document.querySelector("#add-transaction");

const cancelButton =
  document.querySelector("#cancel-transaction");

const addTransferButton =
  document.querySelector("#add-transfer");

const cancelTransferButton =
  document.querySelector("#cancel-transfer");

const cancelCompleteButton =
  document.querySelector("#cancel-complete-transfer");

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

addButton.addEventListener("click", () => {
  editingTransactionId = null;

  form.reset();

  document.querySelector(
    "#transaction-date"
  ).value = getToday();

  document.querySelector(
    "#form-error"
  ).textContent = "";

  dialog.showModal();
});

cancelButton.addEventListener("click", () => {
  dialog.close();
});

addTransferButton.addEventListener("click", () => {
  transferForm.reset();

  document.querySelector(
    "#transfer-sent-date"
  ).value = getToday();

  document.querySelector(
    "#transfer-error"
  ).textContent = "";

  transferDialog.showModal();
});

cancelTransferButton.addEventListener("click", () => {
  transferDialog.close();
});

cancelCompleteButton.addEventListener("click", () => {
  completeDialog.close();
});

const monthFilter =
  document.querySelector("#month-filter");

const currencyFilter =
  document.querySelector("#currency-filter");

monthFilter.addEventListener("change", loadDashboard);
currencyFilter.addEventListener("change", loadDashboard);

function setDefaultMonth() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  document.querySelector("#month-filter").value =
    `${year}-${month}`;
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthRange(month) {
  const [year, monthNumber] = month
    .split("-")
    .map(Number);

  const start =
    `${year}-${String(monthNumber).padStart(2, "0")}-01`;

  const nextMonth = new Date(
    year,
    monthNumber,
    1
  );

  const endYear = nextMonth.getFullYear();

  const endMonth = String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0");

  const end = `${endYear}-${endMonth}-01`;

  return { start, end };
}

async function loadCurrencies() {
  const response = await fetch("/currencies?active=1");

  if (!response.ok) {
    throw new Error("Failed to load currencies");
  }

  const currencies = await response.json();

  const select =
    document.querySelector("#currency-filter");

  const previous = select.value;

  select.replaceChildren();

  for (const currency of currencies) {
    const option = document.createElement("option");

    option.value = currency.code;
    option.textContent = currency.code;

    select.append(option);
  }

  if (previous) {
    select.value = previous;
  }
}

async function loadCategories() {
  const response = await fetch("/categories");

  if (!response.ok) {
    throw new Error("Failed to load categories");
  }

  const categories = await response.json();

  const select =
    document.querySelector("#transaction-category");

  select.replaceChildren();

  for (const category of categories) {
    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = category.name;

    select.append(option);
  }
}

function fillAccountSelect(select) {
  select.replaceChildren();

  for (const account of accountsById.values()) {
    const option = document.createElement("option");

    option.value = account.id;
    option.textContent =
      `${account.name} (${account.currency})`;

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

  fillAccountSelect(
    document.querySelector("#transaction-account")
  );

  fillAccountSelect(
    document.querySelector("#transfer-source")
  );

  fillAccountSelect(
    document.querySelector("#transfer-destination")
  );
}

async function loadAccounts() {
  const response = await fetch("/accounts");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const accounts = await response.json();

  const container = document.querySelector("#accounts");
  container.replaceChildren();

  for (const account of accounts) {
    const card = document.createElement("article");
    card.className = "card";

    const name = document.createElement("h3");
    name.textContent = account.name;

    const balance = document.createElement("p");
    balance.textContent =
      formatMoney(
        account.balance,
        account.currency,
        account.decimalPlaces
      );

    card.append(name, balance);

    if (!account.isActive) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Archived";
      card.append(badge);
    }

    container.append(card);
  }
}

async function loadTransactions() {
  const response = await fetch("/transactions");

  if (!response.ok) {
    throw new Error("Failed to load transactions");
  }

  const transactions = await response.json();

  const container =
    document.querySelector("#transactions");

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

    const amount = document.createElement("strong");

    const actions = document.createElement("div");
    actions.className = "transaction-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    actions.append(editButton, deleteButton);

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        `Delete "${transaction.name}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(
          `/transactions/${transaction.id}`,
          {
            method: "DELETE",
          }
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

      document.querySelector(
        "#transaction-name"
      ).value = transaction.name;

      document.querySelector(
        "#transaction-amount"
      ).value = (
        transaction.amount /
        10 ** transaction.decimalPlaces
      ).toFixed(transaction.decimalPlaces);

      document.querySelector(
        "#transaction-type"
      ).value = transaction.type;

      document.querySelector(
        "#transaction-date"
      ).value = transaction.date;

      document.querySelector(
        "#transaction-category"
      ).value = transaction.categoryId;

      document.querySelector(
        "#transaction-account"
      ).value = transaction.accountId;

      document.querySelector(
        "#transaction-notes"
      ).value = transaction.notes ?? "";

      document.querySelector(
        "#form-error"
      ).textContent = "";

      dialog.showModal();
    });

    amount.className =
      transaction.type === "income"
        ? "amount income"
        : "amount expense";

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

async function loadTransfers() {
  const response = await fetch("/transfers");

  if (!response.ok) {
    throw new Error("Failed to load transfers");
  }

  const transfers = await response.json();

  const container = document.querySelector("#transfers");
  container.replaceChildren();

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
      `${transfer.sentDate} · ${sent} → ${received} · rate ${transfer.exchangeRate}`;

    info.append(title, details);

    const rightSide = document.createElement("div");
    rightSide.className = "transaction-right";

    const badge = document.createElement("span");
    badge.className =
      transfer.status === "pending"
        ? "badge badge-pending"
        : "badge badge-completed";
    badge.textContent = transfer.status;

    rightSide.append(badge);

    if (transfer.status === "pending") {
      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "edit-button";
      completeButton.textContent = "Complete";

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

  document.querySelector(
    "#complete-transfer-info"
  ).textContent =
    `${transfer.sourceAccount} → ${transfer.destinationAccount} · ${transfer.sentDate}`;

  document.querySelector(
    "#complete-transfer-form"
  ).reset();

  document.querySelector(
    "#complete-received-date"
  ).value = getToday();

  document.querySelector(
    "#complete-transfer-error"
  ).textContent = "";

  completeDialog.showModal();
}

async function loadDashboard() {
  const month =
    document.querySelector("#month-filter").value;

  const currency =
    document.querySelector("#currency-filter").value;

  if (!month || !currency) {
    return;
  }

  const { start, end } = getMonthRange(month);

  const params = new URLSearchParams({
    start,
    end,
    currency,
  });

  const response =
    await fetch(`/dashboard?${params}`);

  if (!response.ok) {
    throw new Error("Failed to load dashboard");
  }

  const dashboard = await response.json();

  document.querySelector("#income").textContent =
    formatMoney(
      dashboard.totalIncome,
      dashboard.currency,
      dashboard.decimalPlaces
    );

  document.querySelector("#expense").textContent =
    formatMoney(
      dashboard.totalExpense,
      dashboard.currency,
      dashboard.decimalPlaces
    );

  document.querySelector("#net").textContent =
    formatMoney(
      dashboard.net,
      dashboard.currency,
      dashboard.decimalPlaces
    );
}

const form =
  document.querySelector("#transaction-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accountId = Number(
    document.querySelector("#transaction-account").value
  );

  const account = accountsById.get(accountId);

  const decimalPlaces = account
    ? account.decimalPlaces
    : 2;

  const transaction = {
    name:
      document.querySelector("#transaction-name")
        .value.trim(),

    amount: toMinors(
      Number(
        document.querySelector("#transaction-amount")
          .value
      ),
      decimalPlaces
    ),

    type:
      document.querySelector("#transaction-type")
        .value,

    date:
      document.querySelector("#transaction-date")
        .value,

    categoryId:
      Number(
        document.querySelector("#transaction-category")
          .value
      ),

    accountId,

    notes:
      document.querySelector("#transaction-notes")
        .value.trim() || null,
  };

  try {
    const url =
      editingTransactionId === null
        ? "/transactions"
        : `/transactions/${editingTransactionId}`;

    const method =
      editingTransactionId === null
        ? "POST"
        : "PUT";
      
    const response = await fetch(url, {
      method,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(transaction),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to create transaction"
      );
    }

    form.reset();
    dialog.close();

    await refreshAll();
  } catch (err) {
    document.querySelector("#form-error").textContent =
      err.message;
  }
});

const transferForm =
  document.querySelector("#transfer-form");

transferForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sourceAccountId = Number(
    document.querySelector("#transfer-source").value
  );

  const destinationAccountId = Number(
    document.querySelector("#transfer-destination").value
  );

  const source = accountsById.get(sourceAccountId);
  const destination = accountsById.get(destinationAccountId);

  const receivedValue =
    document.querySelector("#transfer-received").value;

  const status =
    document.querySelector("#transfer-status").value;

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
        : toMinors(
            Number(receivedValue),
            destination ? destination.decimalPlaces : 2
          ),

    exchangeRate: Number(
      document.querySelector("#transfer-rate").value
    ),

    status,

    sentDate:
      document.querySelector("#transfer-sent-date").value,

    receivedDate:
      document.querySelector("#transfer-received-date").value ||
      null,
  };

  try {
    const response = await fetch("/transfers", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(transfer),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create transfer");
    }

    transferForm.reset();
    transferDialog.close();

    await refreshAll();
  } catch (err) {
    document.querySelector("#transfer-error").textContent =
      err.message;
  }
});

const completeForm =
  document.querySelector("#complete-transfer-form");

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

    receivedDate:
      document.querySelector("#complete-received-date").value,
  };

  try {
    const response = await fetch(
      `/transfers/${completingTransfer.id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(transfer),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to complete transfer"
      );
    }

    completeForm.reset();
    completeDialog.close();
    completingTransfer = null;

    await refreshAll();
  } catch (err) {
    document.querySelector(
      "#complete-transfer-error"
    ).textContent = err.message;
  }
});

async function refreshAll() {
  await Promise.all([
    loadAccounts(),
    loadTransactions(),
    loadDashboard(),
    loadTransfers(),
  ]);
}

async function initialize() {
  try {
    setDefaultMonth();

    await loadCurrencies();

    await Promise.all([
      loadAccounts(),
      loadTransactions(),
      loadDashboard(),
      loadTransfers(),
      loadCategories(),
      loadAccountOptions(),
    ]);
  } catch (err) {
    console.error(err);
  }
}

initialize();
