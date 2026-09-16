import { extractInvoiceData } from './lib/extract.js';

const inputText = document.getElementById('inputText');
const extractBtn = document.getElementById('extractBtn');
const errorMsg = document.getElementById('errorMsg');
const invoiceList = document.getElementById('invoiceList');
const emptyState = document.getElementById('emptyState');
const settingsBtn = document.getElementById('settingsBtn');

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
extractBtn.addEventListener('click', handleExtract);
invoiceList.addEventListener('click', handleListClick);

init();

async function init() {
  await render();
}

async function handleExtract() {
  const text = inputText.value.trim();
  hideError();
  if (!text) {
    showError('Paste some invoice or receipt text first.');
    return;
  }

  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    showError('Add your API key in settings first.');
    return;
  }

  setLoading(true);
  try {
    const extracted = await extractInvoiceData(text, apiKey);
    const record = {
      id: crypto.randomUUID(),
      vendor: extracted.vendor || 'Unknown',
      invoiceNumber: extracted.invoiceNumber || '',
      amount: extracted.amount ?? null,
      currency: extracted.currency || '',
      dueDate: extracted.dueDate || '',
      markedPaid: extracted.status === 'paid',
      rawText: text,
      extractedAt: new Date().toISOString()
    };
    await saveRecord(record);
    inputText.value = '';
    await render();
  } catch (err) {
    showError(err.message || 'Could not extract invoice data. Try again.');
  } finally {
    setLoading(false);
  }
}

async function handleListClick(e) {
  const row = e.target.closest('li[data-id]');
  if (!row) return;
  const id = row.dataset.id;

  if (e.target.matches('[data-action="delete"]')) {
    await deleteRecord(id);
    await render();
  } else if (e.target.matches('[data-action="toggle-paid"]')) {
    await togglePaid(id);
    await render();
  }
}

async function getRecords() {
  const { records } = await chrome.storage.local.get('records');
  return records || [];
}

async function saveRecord(record) {
  const records = await getRecords();
  records.unshift(record);
  await chrome.storage.local.set({ records });
}

async function deleteRecord(id) {
  const records = (await getRecords()).filter(r => r.id !== id);
  await chrome.storage.local.set({ records });
}

async function togglePaid(id) {
  const records = await getRecords();
  const rec = records.find(r => r.id === id);
  if (rec) rec.markedPaid = !rec.markedPaid;
  await chrome.storage.local.set({ records });
}

async function render() {
  const records = await getRecords();
  invoiceList.innerHTML = '';
  emptyState.hidden = records.length > 0;

  for (const rec of sortByUrgency(records)) {
    invoiceList.appendChild(renderRow(rec));
  }
}

const URGENCY_RANK = { overdue: 0, 'due-soon': 1, upcoming: 2, paid: 3 };

function sortByUrgency(records) {
  return [...records].sort((a, b) => {
    const rankDiff = URGENCY_RANK[statusFor(a).cls] - URGENCY_RANK[statusFor(b).cls];
    if (rankDiff !== 0) return rankDiff;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

function renderRow(rec) {
  const li = document.createElement('li');
  li.className = 'invoice-row';
  li.dataset.id = rec.id;

  const { label, cls } = statusFor(rec);
  const amountText = rec.amount != null ? formatCurrency(rec.amount, rec.currency) : '—';
  const dueText = rec.dueDate ? formatDate(rec.dueDate) : 'No due date';

  li.innerHTML = `
    <div class="invoice-top">
      <span class="vendor">${escapeHtml(rec.vendor)}</span>
      <span class="amount">${escapeHtml(amountText)}</span>
    </div>
    <div class="meta">${escapeHtml(rec.invoiceNumber ? 'Invoice #' + rec.invoiceNumber + ' · ' : '')}Due ${escapeHtml(dueText)}</div>
    <span class="badge ${cls}">${label}</span>
    <div class="row-actions">
      <button data-action="toggle-paid">${rec.markedPaid ? 'Mark unpaid' : 'Mark paid'}</button>
      <button data-action="delete" class="danger">Delete</button>
    </div>
  `;
  return li;
}

function statusFor(rec) {
  if (rec.markedPaid) return { label: 'Paid', cls: 'paid' };
  if (!rec.dueDate) return { label: 'Upcoming', cls: 'upcoming' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(rec.dueDate);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { label: 'Overdue', cls: 'overdue' };
  if (diffDays <= 3) return { label: 'Due soon', cls: 'due-soon' };
  return { label: 'Upcoming', cls: 'upcoming' };
}

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `${currency || ''} ${amount}`.trim();
  }
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (isNaN(d)) return isoDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setLoading(isLoading) {
  extractBtn.disabled = isLoading;
  extractBtn.textContent = isLoading ? 'Extracting…' : 'Extract';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}
