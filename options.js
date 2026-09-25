const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const status = document.getElementById('status');

init();

async function init() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) {
    apiKeyInput.placeholder = 'AIza••••••••' + apiKey.slice(-4);
  }
}

saveBtn.addEventListener('click', async () => {
  const value = apiKeyInput.value.trim();
  if (!value) return;
  await chrome.storage.local.set({ apiKey: value });
  apiKeyInput.value = '';
  apiKeyInput.placeholder = 'AIza••••••••' + value.slice(-4);
  status.hidden = false;
  setTimeout(() => { status.hidden = true; }, 1500);
});
