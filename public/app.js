let editingTransactionId = null;

const dialog =
  document.querySelector("#transaction-dialog");

const addButton =
  document.querySelector("#add-transaction");

const cancelButton =
  document.querySelector("#cancel-transaction");

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

function formatCurrency(amount, currencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
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

async function loadAccountOptions() {
  const response = await fetch("/accounts");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const accounts = await response.json();

  const select =
    document.querySelector("#transaction-account");

  select.replaceChildren();

  for (const account of accounts) {
    const option = document.createElement("option");

    option.value = account.id;
    option.textContent =
      `${account.name} (${account.currency})`;

    select.append(option);
  }
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
      formatCurrency(
        account.balance,
        account.currency
      );

    card.append(name, balance);
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

        await Promise.all([
          loadAccounts(),
          loadTransactions(),
          loadDashboard(),
        ]);
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
      ).value = transaction.amount;

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

    const formattedAmount = formatCurrency(
      transaction.amount,
      transaction.currency
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

async function loadDashboard() {
  const month =
    document.querySelector("#month-filter").value;

  const currency =
    document.querySelector("#currency-filter").value;

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
    formatCurrency(
      dashboard.totalIncome,
      dashboard.currency
    );

  document.querySelector("#expense").textContent =
    formatCurrency(
      dashboard.totalExpense,
      dashboard.currency
    );

  document.querySelector("#net").textContent =
    formatCurrency(
      dashboard.net,
      dashboard.currency
    );
}

const form =
  document.querySelector("#transaction-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const transaction = {
    name:
      document.querySelector("#transaction-name")
        .value.trim(),

    amount:
      Number(
        document.querySelector("#transaction-amount")
          .value
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

    accountId:
      Number(
        document.querySelector("#transaction-account")
          .value
      ),

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

    await Promise.all([
      loadAccounts(),
      loadTransactions(),
      loadDashboard(),
    ]);
  } catch (err) {
    document.querySelector("#form-error").textContent =
      err.message;
  }
});

async function initialize() {
  try {
    setDefaultMonth();

    await Promise.all([
      loadAccounts(),
      loadTransactions(),
      loadDashboard(),
      loadCategories(),
      loadAccountOptions(),
    ]);
  } catch (err) {
    console.error(err);
  }
}

initialize();