const STORAGE_KEY = "tiffinServiceData";

const selectedDate = document.getElementById("selectedDate");
const orderForm = document.getElementById("orderForm");
const studentName = document.getElementById("studentName");
const tiffinCount = document.getElementById("tiffinCount");
const mealType = document.getElementById("mealType");
const paymentStatus = document.getElementById("paymentStatus");
const dinnerMenu = document.getElementById("dinnerMenu");
const partialPaymentDiv = document.getElementById("partialPaymentDiv");
const paidCountInput = document.getElementById("paidCount");

paymentStatus.addEventListener("change", () => {
  if (paymentStatus.value === "Partial") {
    partialPaymentDiv.style.display = "block";
    paidCountInput.max = tiffinCount.value;
    paidCountInput.value = Math.min(Number(paidCountInput.value) || 0, Number(tiffinCount.value));
  } else {
    partialPaymentDiv.style.display = "none";
  }
});

tiffinCount.addEventListener("input", () => {
  if (paymentStatus.value === "Partial") {
    paidCountInput.max = tiffinCount.value;
    paidCountInput.value = Math.min(Number(paidCountInput.value) || 0, Number(tiffinCount.value));
  }
});

function todayString() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

selectedDate.value = todayString();

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(data, date) {
  if (!data[date]) {
    data[date] = {
      orders: [],
      dinnerMenu: ""
    };
  }
  return data[date];
}

function render() {
  const data = loadData();
  const day = getDay(data, selectedDate.value);

  const dinnerMenuVal = day.dinnerMenu || "";
  dinnerMenu.value = dinnerMenuVal;

  const dinnerDisplay = document.getElementById("dinnerDisplay");
  const dinnerEdit = document.getElementById("dinnerEdit");
  const dinnerText = document.getElementById("dinnerText");

  if (dinnerMenuVal.trim()) {
    dinnerDisplay.style.display = "block";
    dinnerEdit.style.display = "none";
    dinnerText.innerHTML = dinnerMenuVal
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join("");
  } else {
    dinnerDisplay.style.display = "none";
    dinnerEdit.style.display = "block";
    dinnerText.innerHTML = "";
  }

  const lunchOrders = day.orders.filter(o => o.meal === "Lunch");
  const dinnerOrders = day.orders.filter(o => o.meal === "Dinner");

  renderTable("lunchTable", lunchOrders);
  renderTable("dinnerTable", dinnerOrders);

  const lunchTotal = lunchOrders.reduce((sum, o) => sum + o.tiffins, 0);
  const dinnerTotal = dinnerOrders.reduce((sum, o) => sum + o.tiffins, 0);

  let paidTotal = 0;
  let pendingTotal = 0;
  day.orders.forEach(o => {
    let p = o.paidCount;
    if (p === undefined) {
      p = o.payment === "Paid" ? o.tiffins : 0;
    }
    paidTotal += p;
    pendingTotal += (o.tiffins - p);
  });

  document.getElementById("lunchTotal").textContent = lunchTotal;
  document.getElementById("dinnerTotal").textContent = dinnerTotal;
  document.getElementById("grandTotal").textContent = lunchTotal + dinnerTotal;
  document.getElementById("paidTotal").textContent = paidTotal;
  document.getElementById("pendingTotal").textContent = pendingTotal;

  document.getElementById("lunchCountLabel").textContent =
    `${lunchOrders.length} order${lunchOrders.length !== 1 ? "s" : ""}`;

  document.getElementById("dinnerCountLabel").textContent =
    `${dinnerOrders.length} order${dinnerOrders.length !== 1 ? "s" : ""}`;
}

function renderTable(tableId, orders) {
  const tbody = document.getElementById(tableId);
  tbody.innerHTML = "";

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No orders for this meal.</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const row = document.createElement("tr");

    const tiffins = order.tiffins;
    let paidCount = order.paidCount;
    if (paidCount === undefined) {
      paidCount = order.payment === "Paid" ? tiffins : 0;
    }

    let badgeClass = "pending";
    let badgeText = "Pending";
    if (paidCount === tiffins) {
      badgeClass = "paid";
      badgeText = "Paid";
    } else if (paidCount > 0) {
      badgeClass = "partial";
      badgeText = "Partial";
    }

    const badgeHtml = `<span class="badge ${badgeClass}">${badgeText}</span>`;
    const editHtml = `
      <div class="inline-payment-editor">
        <input type="number" min="0" max="${tiffins}" value="${paidCount}" onchange="updatePaidCount('${order.id}', this.value)" class="inline-paid-input">
        <span class="total-slash">/ ${tiffins}</span>
      </div>
    `;

    const paymentButton = paidCount < tiffins
      ? `<button class="small-btn pay-btn" onclick="markPaid('${order.id}')">Pay All</button>`
      : "";

    row.innerHTML = `
      <td>${escapeHtml(order.name)}</td>
      <td>${tiffins}</td>
      <td>
        ${badgeHtml}
        ${editHtml}
      </td>
      <td>
        ${paymentButton}
        <button class="small-btn delete-btn" onclick="deleteOrder('${order.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

orderForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = studentName.value.trim();
  const count = Number(tiffinCount.value);

  if (!name || count < 1) return;

  let paid = 0;
  if (paymentStatus.value === "Paid") {
    paid = count;
  } else if (paymentStatus.value === "Partial") {
    paid = Math.min(count, Math.max(0, Number(paidCountInput.value) || 0));
  }

  const data = loadData();
  const day = getDay(data, selectedDate.value);

  day.orders.push({
    id: Date.now().toString(),
    name,
    tiffins: count,
    meal: mealType.value,
    payment: paid === count ? "Paid" : (paid === 0 ? "Pending" : "Partial"),
    paidCount: paid
  });

  saveData(data);
  orderForm.reset();
  tiffinCount.value = 1;
  paidCountInput.value = 0;
  partialPaymentDiv.style.display = "none";
  render();
});

document.getElementById("saveMenu").addEventListener("click", () => {
  const data = loadData();
  const day = getDay(data, selectedDate.value);
  day.dinnerMenu = dinnerMenu.value.trim();
  saveData(data);
  alert("Dinner menu saved.");
});

selectedDate.addEventListener("change", render);

window.markPaid = function (id) {
  const data = loadData();
  const day = getDay(data, selectedDate.value);
  const order = day.orders.find(o => o.id === id);

  if (order) {
    order.paidCount = order.tiffins;
    order.payment = "Paid";
    saveData(data);
    render();
  }
};

window.updatePaidCount = function (id, value) {
  let val = parseInt(value, 10);
  if (isNaN(val)) val = 0;

  const data = loadData();
  const day = getDay(data, selectedDate.value);
  const order = day.orders.find(o => o.id === id);

  if (order) {
    order.paidCount = Math.max(0, Math.min(order.tiffins, val));
    order.payment = order.paidCount === order.tiffins ? "Paid" : (order.paidCount === 0 ? "Pending" : "Partial");
    saveData(data);
    render();
  }
};

window.deleteOrder = function (id) {
  if (!confirm("Delete this order?")) return;

  const data = loadData();
  const day = getDay(data, selectedDate.value);
  day.orders = day.orders.filter(o => o.id !== id);

  saveData(data);
  render();
};

document.getElementById("clearDay").addEventListener("click", () => {
  if (!confirm("Clear all orders and dinner menu for this date?")) return;

  const data = loadData();
  delete data[selectedDate.value];
  saveData(data);
  render();
});

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

render();