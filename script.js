const STORAGE_KEY = 'paisa-tracker-data';

const categories = [
  { name: 'Food & Dining', icon: '🍽️', color: '#f43f5e', type: 'expense' },
  { name: 'Transport', icon: '🚕', color: '#f59e0b', type: 'expense' },
  { name: 'Bills & Utilities', icon: '⚡', color: '#6366f1', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { name: 'Salary', icon: '💼', color: '#10b981', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#14b8a6', type: 'income' },
  { name: 'Investments', icon: '📈', color: '#0ea5e9', type: 'income' }
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const periodNames = {
  all: 'All time',
  today: 'Today',
  week: 'Last 7 days',
  month: 'This month',
  year: 'This year'
};

let transactions = [];
let period = 'all';
let filter = 'all';
let searchText = '';
let chartYear = new Date().getFullYear();
let chartSeries = 'both';
let budget = 0;
let theme = 'light';
let formType = 'expense';


function $(id) {
  return document.getElementById(id);
}

function loadData() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    saved = null;
  }
  if (!saved) return;

  if (periodNames[saved.period]) period = saved.period;
  if (saved.chartYear) chartYear = saved.chartYear;
  if (['both', 'income', 'expense'].indexOf(saved.chartSeries) !== -1) chartSeries = saved.chartSeries;
  if (['all', 'income', 'expense'].indexOf(saved.txFilter) !== -1) filter = saved.txFilter;
  if (saved.monthlyBudget > 0) budget = saved.monthlyBudget;
  if (saved.theme === 'dark') theme = 'dark';

  if (Array.isArray(saved.transactions)) {
    for (let i = 0; i < saved.transactions.length; i++) {
      const tx = cleanTransaction(saved.transactions[i]);
      if (tx) transactions.push(tx);
    }
  }
}

function saveData() {
  const data = {
    period: period,
    chartYear: chartYear,
    chartSeries: chartSeries,
    txFilter: filter,
    monthlyBudget: budget,
    theme: theme,
    transactions: transactions
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateStorageMeter();
  } catch (error) {
    showToast('Storage full', 'Your changes could not be saved.', 'red');
  }
}

function updateStorageMeter() {
  const text = localStorage.getItem(STORAGE_KEY) || '';
  const kb = new Blob([text]).size / 1024;
  const percent = (kb / 5120) * 100;
  $('storageText').textContent = kb.toFixed(1) + ' KB of 5 MB used';
  $('storageBar').style.width = Math.max(1, percent) + '%';
}


function formatMoney(amount) {
  const text = Math.abs(Math.round(amount)).toLocaleString('en-IN');
  if (amount < 0) return '-₹' + text;
  return '₹' + text;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function toInputValue(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function parseDate(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return new Date();
  return date;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function totalOf(list) {
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total += list[i].amount;
  }
  return total;
}

function getCategory(name) {
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].name === name) return categories[i];
  }
  return categories[0];
}

function makeId() {
  return 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function sortTransactions() {
  transactions.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
}

function isInPeriod(isoString, name) {
  if (name === 'all') return true;

  const date = new Date(isoString);
  const now = new Date();

  if (name === 'today') {
    return date.toDateString() === now.toDateString();
  }
  if (name === 'week') {
    const start = new Date();
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  }
  if (name === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return date.getFullYear() === now.getFullYear();
}

function cleanTransaction(tx) {
  if (!tx) return null;
  if (tx.type !== 'income' && tx.type !== 'expense') return null;

  const amount = Math.round(Number(tx.amount));
  if (!(amount > 0)) return null;

  return {
    id: String(tx.id || makeId()),
    type: tx.type,
    amount: amount,
    category: getCategory(tx.category).name,
    description: String(tx.description || 'Untitled').slice(0, 120),
    date: parseDate(tx.date).toISOString()
  };
}

function showToast(title, subtitle, tone) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + (tone || '');
  toast.innerHTML = '<strong>' + escapeHtml(title) + '</strong><small>' + escapeHtml(subtitle || '') + '</small>';
  $('toasts').appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3200);
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function animateNumber(element, target) {
  const start = Number(element.dataset.value || 0);
  element.dataset.value = target;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (start === target || reduceMotion) {
    element.textContent = formatMoney(target);
    return;
  }

  const startTime = performance.now();
  const duration = 600;
  cancelAnimationFrame(Number(element.dataset.frame));

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatMoney(start + (target - start) * eased);
    if (progress < 1) element.dataset.frame = requestAnimationFrame(step);
  }
  element.dataset.frame = requestAnimationFrame(step);
}


function showGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let part = 'Evening';
  if (hour < 12) part = 'Morning';
  else if (hour < 17) part = 'Afternoon';

  $('greeting').textContent = 'Good ' + part;
  $('greetingIcon').textContent = hour < 17 ? '☀️' : '🌙';
  $('dateChip').textContent = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function lastSevenDays(type) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);

    let total = 0;
    for (let j = 0; j < transactions.length; j++) {
      const tx = transactions[j];
      if (tx.type === type && new Date(tx.date).toDateString() === day.toDateString()) {
        total += tx.amount;
      }
    }
    result.push(total);
  }
  return result;
}

function makeSparkline(values, color) {
  const max = Math.max(1, ...values);
  const points = [];
  for (let i = 0; i < values.length; i++) {
    const x = (i / 6) * 100;
    const y = 28 - (values[i] / max) * 24;
    points.push(x + ',' + y);
  }
  const line = points.join(' ');
  return '<svg viewBox="0 0 100 30" preserveAspectRatio="none">'
    + '<polygon points="0,30 ' + line + ' 100,30" fill="' + color + '" fill-opacity="0.12"/>'
    + '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
}

function setBadge(id, text, direction) {
  $(id).className = 'trend ' + direction;
  $(id).textContent = text;
}

function showSummary() {
  const incomeList = [];
  const expenseList = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!isInPeriod(tx.date, period)) continue;
    if (tx.type === 'income') incomeList.push(tx);
    else expenseList.push(tx);
  }

  const income = totalOf(incomeList);
  const expense = totalOf(expenseList);

  animateNumber($('incomeValue'), income);
  animateNumber($('expenseValue'), expense);
  animateNumber($('balanceValue'), income - expense);

  const dailyIncome = lastSevenDays('income');
  const dailyExpense = lastSevenDays('expense');
  const dailyBalance = [];
  for (let i = 0; i < 7; i++) {
    dailyBalance.push(dailyIncome[i] - dailyExpense[i]);
  }
  $('incomeSpark').innerHTML = makeSparkline(dailyIncome, '#10b981');
  $('expenseSpark').innerHTML = makeSparkline(dailyExpense, '#f43f5e');
  $('balanceSpark').innerHTML = makeSparkline(dailyBalance, '#6366f1');

  if (income) setBadge('incomeBadge', '▲ ' + incomeList.length + ' income entries', 'up');
  else setBadge('incomeBadge', 'No income yet', 'neutral');

  if (expense) setBadge('expenseBadge', '▼ ' + expenseList.length + ' expense entries', 'down');
  else setBadge('expenseBadge', 'No expenses yet', 'neutral');

  if (income > 0) {
    $('savingsText').textContent = Math.round(((income - expense) / income) * 100) + '% of income saved';
  } else {
    $('savingsText').textContent = 'Add income to see savings';
  }

  showBudget();
}

function showBudget() {
  let spent = 0;
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (tx.type === 'expense' && isInPeriod(tx.date, 'month')) spent += tx.amount;
  }

  if (!budget) {
    $('budgetLeft').textContent = 'Not set';
    $('budgetText').textContent = formatMoney(spent) + ' spent this month';
    $('budgetPct').textContent = '–';
    $('budgetBar').style.width = '0';
    $('runwayValue').textContent = 'No budget yet';
    $('runwayText').textContent = 'Set a monthly budget to see your runway';
    return;
  }

  const percent = Math.min(100, Math.round((spent / budget) * 100));
  $('budgetLeft').textContent = formatMoney(budget - spent) + ' left';
  $('budgetText').textContent = formatMoney(spent) + ' spent of ' + formatMoney(budget) + ' this month';
  $('budgetPct').textContent = percent + '% used';
  $('budgetBar').style.width = Math.max(percent, 3) + '%';
  $('runwayValue').textContent = formatMoney(budget - spent) + ' left';
  $('runwayText').textContent = 'Budget utilization at ' + percent + '%';
}

function showBarChart() {
  const income = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const expense = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const date = new Date(tx.date);
    if (date.getFullYear() !== chartYear) continue;
    if (tx.type === 'income') income[date.getMonth()] += tx.amount;
    else expense[date.getMonth()] += tx.amount;
  }

  let yearIncome = 0;
  let yearExpense = 0;
  let biggest = 500;
  for (let i = 0; i < 12; i++) {
    yearIncome += income[i];
    yearExpense += expense[i];
    biggest = Math.max(biggest, income[i], expense[i]);
  }

  $('annualIncome').textContent = formatMoney(yearIncome);
  $('annualExpense').textContent = formatMoney(yearExpense);
  $('annualNet').textContent = formatMoney(yearIncome - yearExpense);

  const top = Math.ceil(biggest / 100) * 100;
  const steps = [1, 0.75, 0.5, 0.25, 0];
  let axis = '';
  for (let i = 0; i < steps.length; i++) {
    axis += '<span>' + formatMoney(top * steps[i]) + '</span>';
  }
  $('yAxis').innerHTML = axis;

  const now = new Date();
  let html = '';
  for (let i = 0; i < 12; i++) {
    const isCurrent = chartYear === now.getFullYear() && i === now.getMonth();
    let bars = '';
    if (chartSeries !== 'expense' && income[i]) {
      bars += '<span class="bar-income" style="height: ' + (income[i] / top) * 100 + '%"></span>';
    }
    if (chartSeries !== 'income' && expense[i]) {
      bars += '<span class="bar-expense" style="height: ' + (expense[i] / top) * 100 + '%"></span>';
    }

    html += '<div class="bar-col" title="' + months[i] + ': income ' + formatMoney(income[i]) + ', expenses ' + formatMoney(expense[i]) + '">'
      + '<div class="bar-pair">' + bars + '</div>'
      + '<span class="bar-label ' + (isCurrent ? 'current' : '') + '">' + months[i] + '</span>'
      + '</div>';
  }

  $('yearLabel').textContent = chartYear;
  $('bars').innerHTML = html;
}

function showDonut() {
  const totals = {};
  let total = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (tx.type !== 'expense' || !isInPeriod(tx.date, period)) continue;
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    total += tx.amount;
  }

  $('donutSubtitle').textContent = 'Category distribution • ' + periodNames[period];
  animateNumber($('donutAmount'), total);

  if (total === 0) {
    $('donut').style.background = '';
    $('legend').innerHTML = '<p class="empty">No expenses in this period</p>';
    return;
  }

  const names = Object.keys(totals);
  names.sort(function (a, b) {
    return totals[b] - totals[a];
  });

  let start = 0;
  const slices = [];
  let legend = '';

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const amount = totals[name];
    const category = getCategory(name);
    const end = start + (amount / total) * 100;

    slices.push(category.color + ' ' + start + '% ' + end + '%');
    start = end;

    legend += '<div class="legend-row">'
      + '<span><span class="dot" style="background: ' + category.color + '"></span>' + category.icon + ' ' + name + '</span>'
      + '<span>' + formatMoney(amount) + ' <span class="muted">(' + Math.round((amount / total) * 100) + '%)</span></span>'
      + '</div>';
  }

  $('donut').style.background = 'conic-gradient(' + slices.join(', ') + ')';
  $('legend').innerHTML = legend;
}

function showTable() {
  const query = searchText.trim().toLowerCase();
  const rows = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const typeMatches = filter === 'all' || tx.type === filter;
    const searchMatches = query === ''
      || tx.description.toLowerCase().indexOf(query) !== -1
      || tx.category.toLowerCase().indexOf(query) !== -1;
    if (typeMatches && searchMatches) rows.push(tx);
  }

  $('txCount').textContent = transactions.length;
  $('entryCount').textContent = rows.length + (rows.length === 1 ? ' entry' : ' entries');

  if (rows.length === 0) {
    let message = 'No transactions match your search.';
    if (transactions.length === 0) {
      message = 'No transactions yet. Click "+ New Transaction" to add your first one.';
    }
    $('tableBody').innerHTML = '<tr><td colspan="6" class="empty"><span class="empty-icon">🧾</span>' + message + '</td></tr>';
    return;
  }

  let html = '';
  for (let i = 0; i < rows.length; i++) {
    const tx = rows[i];
    const isIncome = tx.type === 'income';
    const category = getCategory(tx.category);

    html += '<tr>'
      + '<td><div class="tx-name"><span class="tx-icon" style="background: ' + category.color + '1f">' + category.icon + '</span>' + escapeHtml(tx.description) + '</div></td>'
      + '<td><span class="badge" style="background: ' + category.color + '1f; color: ' + category.color + '">' + tx.category + '</span></td>'
      + '<td class="muted">' + formatDate(tx.date) + '</td>'
      + '<td><span class="badge ' + (isIncome ? 'green-text' : 'red-text') + '">' + (isIncome ? 'Income' : 'Expense') + '</span></td>'
      + '<td class="right amount ' + (isIncome ? 'income' : '') + '">' + (isIncome ? '+' : '−') + formatMoney(tx.amount) + '</td>'
      + '<td class="right">'
      + '<button class="icon-btn" data-edit="' + tx.id + '" title="Edit">✏️</button>'
      + '<button class="icon-btn" data-delete="' + tx.id + '" title="Delete">🗑️</button>'
      + '</td>'
      + '</tr>';
  }
  $('tableBody').innerHTML = html;
}

function setActiveButton(containerId, attribute, value) {
  const buttons = $(containerId).querySelectorAll('button');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('active', buttons[i].dataset[attribute] === value);
  }
}

function syncControls() {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  $('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('periodSelect').value = period;
  $('budgetInput').value = budget || '';
  $('searchInput').value = searchText;
  setActiveButton('seriesPills', 'series', chartSeries);
  document.querySelector('input[name="txFilter"][value="' + filter + '"]').checked = true;
}

function refreshAll() {
  showSummary();
  showBarChart();
  showDonut();
  showTable();
}


function fillCategories() {
  let html = '';
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].type === formType) {
      html += '<option value="' + categories[i].name + '">' + categories[i].icon + ' ' + categories[i].name + '</option>';
    }
  }
  $('txCategory').innerHTML = html;
}

function setFormType(type) {
  const oldCategory = $('txCategory').value;
  formType = type;
  setActiveButton('txForm', 'type', type);
  fillCategories();
  if (getCategory(oldCategory).type === type) {
    $('txCategory').value = oldCategory;
  }
}

function openDrawer(tx) {
  $('drawerTitle').textContent = tx ? 'Edit transaction' : 'New transaction';
  $('editId').value = tx ? tx.id : '';
  $('txAmount').value = tx ? tx.amount : '';
  $('txDescription').value = tx ? tx.description : '';
  $('txDate').value = toInputValue(tx ? new Date(tx.date) : new Date());

  formType = tx ? tx.type : 'expense';
  fillCategories();
  if (tx) $('txCategory').value = tx.category;
  setActiveButton('txForm', 'type', formType);

  $('drawer').hidden = false;
  $('txAmount').focus();
}

function closeDrawer() {
  $('drawer').hidden = true;
}

function resetForm() {
  $('txAmount').value = '';
  $('txDescription').value = '';
  $('txDate').value = toInputValue(new Date());
  $('txCategory').selectedIndex = 0;
  $('txAmount').focus();
}

function saveTransaction(event) {
  event.preventDefault();

  const amount = Math.round(Number($('txAmount').value));
  const description = $('txDescription').value.trim();
  if (!amount || !description) return;

  const category = $('txCategory').value;
  const date = parseDate($('txDate').value).toISOString();
  const editId = $('editId').value;

  if (editId) {
    for (let i = 0; i < transactions.length; i++) {
      if (transactions[i].id === editId) {
        transactions[i].type = formType;
        transactions[i].amount = amount;
        transactions[i].category = category;
        transactions[i].description = description;
        transactions[i].date = date;
      }
    }
    showToast('Transaction updated', description);
  } else {
    transactions.push({
      id: makeId(),
      type: formType,
      amount: amount,
      category: category,
      description: description,
      date: date
    });
    showToast(
      formType === 'income' ? 'Income added' : 'Expense added',
      description + ' · ' + formatMoney(amount),
      formType === 'income' ? 'green' : 'red'
    );
  }

  sortTransactions();
  saveData();
  closeDrawer();
  refreshAll();
}

function deleteTransaction(id) {
  const kept = [];
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].id !== id) kept.push(transactions[i]);
  }
  transactions = kept;
  saveData();
  refreshAll();
  showToast('Transaction deleted', '', 'red');
}

function deleteAllData() {
  transactions = [];
  period = 'all';
  filter = 'all';
  searchText = '';
  chartSeries = 'both';
  chartYear = new Date().getFullYear();
  budget = 0;
  theme = 'light';
  saveData();
  syncControls();
  refreshAll();
  $('resetModal').hidden = true;
  showToast('All data deleted');
}


function exportCSV() {
  if (transactions.length === 0) {
    showToast('Nothing to export', 'Add a transaction first.', 'red');
    return;
  }

  let csv = '"Date","Type","Category","Description","Amount (INR)"\n';
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const date = toInputValue(new Date(tx.date)).replace('T', ' ');
    const description = tx.description.replace(/"/g, '""');
    csv += '"' + date + '","' + tx.type + '","' + tx.category + '","' + description + '","' + tx.amount + '"\n';
  }

  downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'paisa-tracker.csv');
  showToast('CSV exported', transactions.length + ' transactions', 'green');
}

function exportBackup() {
  const backup = JSON.stringify({ monthlyBudget: budget, transactions: transactions }, null, 2);
  downloadFile(new Blob([backup], { type: 'application/json' }), 'paisa-tracker-backup.json');
  showToast('Backup saved', 'Use Import to restore it later.', 'green');
}

function downloadSampleSheet() {
  const today = toInputValue(new Date()).replace('T', ' ');
  const rows = [
    ['Date', 'Type', 'Category', 'Description', 'Amount'],
    [today, 'Expense', 'Food & Dining', 'Lunch', 180],
    [today, 'Expense', 'Transport', 'Metro recharge', 300],
    [today, 'Income', 'Salary', 'Monthly salary', 45000]
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Transactions');
  XLSX.writeFile(book, 'paisa-tracker-sample.xlsx');
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function rowsToTransactions(rows) {
  const headers = [];
  for (let i = 0; i < rows[0].length; i++) {
    headers.push(String(rows[0][i]).trim().toLowerCase());
  }

  function findColumn(word) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].indexOf(word) !== -1) return i;
    }
    return -1;
  }

  const dateColumn = findColumn('date');
  const typeColumn = findColumn('type');
  const categoryColumn = findColumn('category');
  const descriptionColumn = findColumn('desc');
  const amountColumn = findColumn('amount');

  function cell(row, column) {
    if (column === -1) return '';
    return row[column];
  }

  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const type = String(cell(row, typeColumn)).toLowerCase().indexOf('inc') === 0 ? 'income' : 'expense';
    const amount = Math.abs(Number(String(cell(row, amountColumn)).replace(/[₹,\s]/g, '')));
    let category = String(cell(row, categoryColumn)).trim();

    let known = false;
    for (let j = 0; j < categories.length; j++) {
      if (categories[j].name === category) known = true;
    }
    if (!known) category = type === 'income' ? 'Salary' : 'Food & Dining';

    const tx = cleanTransaction({
      id: makeId(),
      type: type,
      amount: amount,
      category: category,
      description: String(cell(row, descriptionColumn) || category || 'Imported entry').trim(),
      date: cell(row, dateColumn)
    });
    if (tx) result.push(tx);
  }
  return result;
}

function addImported(list, source) {
  if (list.length === 0) {
    showToast('Nothing imported', 'No valid rows were found in the file.', 'red');
    return;
  }

  let added = 0;
  for (let i = 0; i < list.length; i++) {
    let exists = false;
    for (let j = 0; j < transactions.length; j++) {
      if (transactions[j].id === list[i].id) exists = true;
    }
    if (!exists) {
      transactions.push(list[i]);
      added++;
    }
  }

  sortTransactions();
  saveData();
  refreshAll();
  showToast('Import complete', added + ' transactions added from ' + source + '.', 'green');
}

function importFile(file) {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
  const reader = new FileReader();

  reader.onload = function () {
    try {
      if (name.endsWith('.json')) {
        const backup = JSON.parse(reader.result);
        if (backup.monthlyBudget > 0) budget = backup.monthlyBudget;
        const list = [];
        const items = backup.transactions || [];
        for (let i = 0; i < items.length; i++) {
          const tx = cleanTransaction(items[i]);
          if (tx) list.push(tx);
        }
        addImported(list, 'backup');
        syncControls();
      } else if (isExcel) {
        const book = XLSX.read(new Uint8Array(reader.result), { type: 'array', cellDates: true });
        const sheet = book.Sheets[book.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        addImported(rowsToTransactions(rows), 'Excel file');
      } else {
        const lines = reader.result.split(/\r?\n/);
        const rows = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim()) rows.push(splitCsvLine(lines[i]));
        }
        addImported(rowsToTransactions(rows), 'CSV file');
      }
    } catch (error) {
      showToast('Could not read the file', 'Use a .xlsx, .csv or .json file.', 'red');
    }
  };

  if (isExcel) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarBackdrop').classList.add('show');
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarBackdrop').classList.remove('show');
}

function changeChartYear(step) {
  chartYear += step;
  saveData();
  showBarChart();
}

function setupEvents() {
  $('themeBtn').addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveData();
    syncControls();
  });

  $('periodSelect').addEventListener('change', function (event) {
    period = event.target.value;
    saveData();
    showSummary();
    showDonut();
  });

  $('seriesPills').addEventListener('click', function (event) {
    if (!event.target.dataset.series) return;
    chartSeries = event.target.dataset.series;
    saveData();
    syncControls();
    showBarChart();
  });

  $('filterPills').addEventListener('change', function (event) {
    filter = event.target.value;
    saveData();
    showTable();
  });

  $('searchInput').addEventListener('input', function (event) {
    searchText = event.target.value;
    showTable();
  });

  $('setBudgetBtn').addEventListener('click', function () {
    const value = Math.round(Number($('budgetInput').value));
    if (!(value > 0)) {
      showToast('Invalid budget', 'Enter an amount greater than zero.', 'red');
      return;
    }
    budget = value;
    saveData();
    showBudget();
    showToast('Budget saved', formatMoney(value) + ' per month', 'green');
  });

  $('prevYearBtn').addEventListener('click', function () {
    changeChartYear(-1);
  });
  $('nextYearBtn').addEventListener('click', function () {
    changeChartYear(1);
  });

  $('tableBody').addEventListener('click', function (event) {
    const editButton = event.target.closest('[data-edit]');
    const deleteButton = event.target.closest('[data-delete]');

    if (editButton) {
      for (let i = 0; i < transactions.length; i++) {
        if (transactions[i].id === editButton.dataset.edit) openDrawer(transactions[i]);
      }
    }
    if (deleteButton) {
      deleteTransaction(deleteButton.dataset.delete);
    }
  });

  $('newTxBtn').addEventListener('click', function () {
    openDrawer(null);
  });
  $('resetFormBtn').addEventListener('click', resetForm);
  $('cancelBtn').addEventListener('click', closeDrawer);
  $('drawer').addEventListener('click', function (event) {
    if (event.target === $('drawer')) closeDrawer();
  });
  $('txForm').addEventListener('submit', saveTransaction);

  const typeButtons = $('txForm').querySelectorAll('[data-type]');
  for (let i = 0; i < typeButtons.length; i++) {
    typeButtons[i].addEventListener('click', function (event) {
      setFormType(event.target.dataset.type);
    });
  }

  $('exportCsvBtn').addEventListener('click', exportCSV);
  $('exportJsonBtn').addEventListener('click', exportBackup);
  $('sampleBtn').addEventListener('click', downloadSampleSheet);
  $('importBtn').addEventListener('click', function () {
    $('importInput').click();
  });
  $('importInput').addEventListener('change', function (event) {
    if (event.target.files[0]) importFile(event.target.files[0]);
    event.target.value = '';
  });

  $('resetBtn').addEventListener('click', function () {
    $('resetModal').hidden = false;
  });
  $('cancelResetBtn').addEventListener('click', function () {
    $('resetModal').hidden = true;
  });
  $('confirmResetBtn').addEventListener('click', deleteAllData);

  const navItems = document.querySelectorAll('.nav-item');
  for (let i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener('click', function () {
      for (let j = 0; j < navItems.length; j++) {
        navItems[j].classList.remove('active');
      }
      navItems[i].classList.add('active');
      closeSidebar();
      $(navItems[i].dataset.target).scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeSidebar();
      closeDrawer();
      $('resetModal').hidden = true;
      return;
    }

    const typing = event.target.closest('input, select, textarea');
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      openDrawer(null);
    } else if (event.key === '/') {
      event.preventDefault();
      $('searchInput').focus();
    }
  });

  $('menuBtn').addEventListener('click', openSidebar);
  $('sidebarBackdrop').addEventListener('click', closeSidebar);

  const cards = document.querySelectorAll('.card');
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    card.addEventListener('mousemove', function (event) {
      const box = card.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');

      if (card.classList.contains('stat')) {
        card.style.setProperty('--ry', (x / box.width - 0.5) * 8 + 'deg');
        card.style.setProperty('--rx', (0.5 - y / box.height) * 8 + 'deg');
      }
    });

    card.addEventListener('mouseleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}
function setupCursor() {
  const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hasMouse || reduceMotion) return;

  function addElement(className) {
    const element = document.createElement('div');
    element.className = className;
    document.body.appendChild(element);
    return element;
  }

  const dot = addElement('cursor-dot');
  const ring = addElement('cursor-ring');
  document.body.classList.add('has-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let lastSparkX = mouseX;
  let lastSparkY = mouseY;
  const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9'];

  document.addEventListener('mousemove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    dot.style.transform = 'translate(' + mouseX + 'px, ' + mouseY + 'px)';

    const distance = Math.sqrt((mouseX - lastSparkX) * (mouseX - lastSparkX) + (mouseY - lastSparkY) * (mouseY - lastSparkY));
    if (distance > 28) {
      const spark = addElement('spark-dot');
      spark.style.left = mouseX + 'px';
      spark.style.top = mouseY + 'px';
      spark.style.background = colors[Math.floor(Math.random() * colors.length)];
      setTimeout(function () {
        spark.remove();
      }, 800);
      lastSparkX = mouseX;
      lastSparkY = mouseY;
    }
  });

  document.addEventListener('mouseover', function (event) {
    const clickable = event.target.closest('button, select, label, tbody tr, .nav-item');
    const typing = event.target.closest('input');
    ring.classList.toggle('active', Boolean(clickable));
    dot.classList.toggle('hidden', Boolean(typing));
    ring.classList.toggle('hidden', Boolean(typing));
  });

  document.addEventListener('mousedown', function (event) {
    ring.classList.add('pressed');
    const ripple = addElement('click-ripple');
    ripple.style.left = event.clientX + 'px';
    ripple.style.top = event.clientY + 'px';
    setTimeout(function () {
      ripple.remove();
    }, 600);
  });

  document.addEventListener('mouseup', function () {
    ring.classList.remove('pressed');
  });

  function moveRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = 'translate(' + ringX + 'px, ' + ringY + 'px)';
    requestAnimationFrame(moveRing);
  }
  moveRing();
}


loadData();
sortTransactions();
syncControls();
showGreeting();
updateStorageMeter();
setupEvents();
setupCursor();
refreshAll();