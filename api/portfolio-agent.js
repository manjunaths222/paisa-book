const PROVIDERS = {
  openai: {
    key: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini'
  },
  anthropic: {
    key: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest'
  },
  gemini: {
    key: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash'
  }
};

const SYSTEM_PROMPT = `You are Paisa Book's portfolio assistant for an Indian family finance ledger.
Answer only from the provided portfolio snapshot and the user's assumptions.
You can help with portfolio lookup, projections, affordability checks, obligation awareness, and financial health suggestions.
Show calculations in compact steps when the user asks "what if" or affordability questions.
Format answers as concise Markdown with short headings, bullet points, and bold emphasis only where helpful.
Call out missing assumptions and use conservative defaults only when you clearly label them.
Do not present yourself as a SEBI registered investment adviser, tax adviser, lawyer, or insurance agent.
Do not recommend specific securities or funds. Keep suggestions educational, practical, and risk-aware.
Use Indian numbering and rupee formatting when the snapshot currency is INR.`;
const DEFAULT_MAX_OUTPUT_TOKENS = 3000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const question = String(body?.question ?? '').trim();
    const snapshot = scrubForModel(body?.snapshot);

    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    if (!snapshot || typeof snapshot !== 'object') {
      res.status(400).json({ error: 'Portfolio snapshot is required' });
      return;
    }

    const provider = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
    if (!PROVIDERS[provider]) {
      res.status(500).json({ error: `Unsupported AI_PROVIDER: ${provider}` });
      return;
    }

    const answer = await callProvider({
      provider,
      model: process.env.AI_MODEL || PROVIDERS[provider].defaultModel,
      apiKey: process.env[PROVIDERS[provider].key],
      maxOutputTokens: outputTokenLimit(),
      question,
      snapshot
    });

    res.status(200).json({
      provider,
      model: process.env.AI_MODEL || PROVIDERS[provider].defaultModel,
      answer
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Portfolio assistant failed'
    });
  }
}

function outputTokenLimit() {
  const parsed = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? DEFAULT_MAX_OUTPUT_TOKENS);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(Math.max(Math.trunc(parsed), 500), 8000);
}

function scrubForModel(value) {
  const blockedKeys = new Set([
    'id',
    'uid',
    'email',
    'displayName',
    'photoURL',
    'name',
    'memberName',
    'referenceId',
    'description',
    'pan',
    'dob',
    'bankName',
    'institutionName',
    'companyName',
    'tickerSymbol',
    'fundName',
    'amfiCode',
    'loanName',
    'insurerName',
    'policyName',
    'nominee'
  ]);

  if (Array.isArray(value)) return value.map(scrubForModel);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedKeys.has(key))
      .map(([key, item]) => [key, scrubForModel(item)])
  );
}

async function callProvider({ provider, model, apiKey, maxOutputTokens, question, snapshot }) {
  if (!apiKey) {
    throw new Error(`Missing ${PROVIDERS[provider].key}`);
  }

  const portfolioContext = JSON.stringify(snapshot);
  const userPrompt = `Portfolio snapshot JSON:\n${portfolioContext}\n\nUser question:\n${question}`;

  if (provider === 'anthropic') {
    return callAnthropic({ apiKey, model, maxOutputTokens, userPrompt });
  }
  if (provider === 'gemini') {
    return callGemini({ apiKey, model, maxOutputTokens, userPrompt });
  }
  return callOpenAI({ apiKey, model, maxOutputTokens, userPrompt });
}

async function callOpenAI({ apiKey, model, maxOutputTokens, userPrompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxOutputTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const json = await parseProviderResponse(response);
  return json.choices?.[0]?.message?.content?.trim() || 'No answer returned.';
}

async function callAnthropic({ apiKey, model, maxOutputTokens, userPrompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const json = await parseProviderResponse(response);
  return json.content?.map((part) => part.text).filter(Boolean).join('\n').trim() || 'No answer returned.';
}

async function callGemini({ apiKey, model, maxOutputTokens, userPrompt }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
          }
        ]
      })
    }
  );
  const json = await parseProviderResponse(response);
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n').trim() || 'No answer returned.';
}

async function parseProviderResponse(response) {
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json.error?.message || json.error || response.statusText;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return json;
}
