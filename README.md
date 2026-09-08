# Invoice Extractor

Training project: a Chrome extension that turns pasted invoice/receipt text into
structured, trackable payment records. This is step one of the plan toward
Cashflow Copilot — this teaches the AI-extraction + extension-UI + storage loop
on a small scope before adding email scanning and follow-up generation.

## Load it in Chrome
1. Go to `chrome://extensions`
2. Turn on "Developer mode" (top right)
3. Click "Load unpacked" and select this folder
4. Pin the extension, then click its icon to open the popup

## Set up your API key (free)
1. Click the gear icon in the popup (or right-click the extension icon → Options)
2. Get a free key at https://aistudio.google.com/apikey — sign in with a Google
   account, no credit card required
3. Paste it in and click Save — it's stored only in this browser's local
   extension storage, and is only ever sent to Google's Gemini API.

## Try it
Paste some invoice or receipt text into the box (an email body works fine) and
click Extract. It pulls out vendor, invoice number, amount, and due date, then
tracks it in a list below with an overdue/due-soon/paid badge.

## What's next (toward Cashflow Copilot)
- Read from actual inbox emails instead of pasted text
- A small backend so data isn't only local to one browser
- Auto-generated follow-up emails for overdue invoices
- One-click send
