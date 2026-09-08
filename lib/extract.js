const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You extract structured payment data from invoice or receipt text (often pasted from an email).
Return ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "vendor": string,        // who the payment is owed to, or who sent the invoice
  "invoiceNumber": string, // invoice/receipt number if present, else ""
  "amount": number,        // numeric amount only, no currency symbol
  "currency": string,      // 3-letter code, e.g. "USD", best guess if not stated
  "dueDate": string,       // ISO date YYYY-MM-DD if a due date is stated or inferable, else ""
  "status": string         // "paid" if the text indicates it's already paid, otherwise "unpaid"
}
If a field cannot be determined, use "" for strings, 0 for amount, and default currency "USD".`;

export async function extractInvoiceData(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key. Check it in settings.');
    }
    if (response.status === 429) {
      throw new Error('Free quota hit for now — wait a bit and try again.');
    }
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Unexpected response from Gemini API.');

  const jsonText = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Could not parse extraction result. Try pasting cleaner invoice text.');
  }

  return parsed;
}
