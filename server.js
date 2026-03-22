// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));  

// OpenAI client (reads key from Render env var)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple health check
app.get('/', (req, res) => {
  res.send('LockdIn AI backend is running');
});

// Real AI Review endpoint
app.post('/ai-review', async (req, res) => {
  try {
    console.log('Received /ai-review payload');
    const payload = req.body;

    // Last 100 trades
    const trades = Array.isArray(payload?.trades)
      ? payload.trades.slice(-100)
      : [];

    const basicStats = {
      tradeCount: trades.length,
      wins: trades.filter(t => t.result === 'win').length,
      losses: trades.filter(t => t.result === 'loss').length,
      breakEvens: trades.filter(t => t.result === 'be').length,
      totalR: trades.reduce((sum, t) => sum + (t.r || 0), 0),
    };

    const prompt = `
You are a trading performance coach.

Return a JSON object with this exact shape:

{
  "overall_summary": {
    "grade": "string like B-",
    "headline": "one-line coaching headline about their performance",
    "pnl_summary": {
      "total_r": number,
      "win_rate": number
    }
  },
  "strengths": ["short coaching bullet", "short coaching bullet"],
  "weaknesses": ["short coaching bullet"],
  "coaching_notes": [
    "specific, practical coaching note about their habits and mindset",
    "another specific coaching note"
  ]
}

Data to analyze (last 100 trades max):
BASIC_STATS:
${JSON.stringify(basicStats)}

TRADES_JSON:
${JSON.stringify(trades)}
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert trading performance coach. Respond ONLY with valid JSON matching the requested shape. Be concise but specific.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    console.log('Usage:', completion.usage);

    const aiJson = JSON.parse(completion.choices[0].message.content);
    res.json(aiJson);
  } catch (err) {
    console.error('AI error on /ai-review:', err);
    res.status(500).json({
      error: 'AI review failed',
      details: err.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`LockdIn AI backend listening on ${PORT}`);
});
// AI Log Trade endpoint
app.post('/ai-log-trade', async (req, res) => {
  try {
    console.log('Received /ai-log-trade payload');
    const { description, image, today } = req.body || {};

    const todayStr = today || new Date().toISOString().split('T')[0];

    const userPrompt = `
You are a trading journal assistant for a forex/indices trader.

Analyse the following trade description (and chart image if provided) and return a SINGLE JSON object with this EXACT shape:

{
  "pair": "GBPUSD / XAUUSD / NAS100 / ...",
  "date": "YYYY-MM-DD",
  "direction": "Long" | "Short",
  "entry_time": "HH:MM" | null,
  "exit_time": "HH:MM" | null,
  "pnl": number,                 // positive = profit, negative = loss, in account currency
  "r": number | null,            // R multiple if clearly implied, otherwise null
  "risk_pct": number | null,     // risk as percent e.g. 1, if obvious
  "strategy": "short name e.g. OB + sweep / FVG / Breakout",
  "exec": "perfect" | "fomo" | "revenge" | "sl" | "oversize" | "early",
  "grade": "A" | "B" | "C" | "D" | "F",
  "notes": "A structured trade recap with sections:
OVERVIEW
- Setup: ...
- Reason: ...
- Confluences: ...

EXECUTION
- Did well: ...
- Did poorly: ...

LESSONS
1) ...
2) ...

WHAT WOULD I DO DIFFERENTLY?
..."
}

Today is ${todayStr}.
If some fields are not explicitly stated, infer sensible values from context.
Always respond with STRICT JSON (no comments, no backticks).
    
TRADE_DESCRIPTION:
${description || '(none)'}
`;

    // Build messages (we're not actually doing vision here yet; image is just context)
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert trading journal assistant. Respond ONLY with valid JSON that matches the requested schema.',
      },
      { role: 'user', content: userPrompt },
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
      response_format: { type: 'json_object' },
    });

    console.log('Usage /ai-log-trade:', completion.usage);

    const parsed = JSON.parse(completion.choices[0].message.content);

    // Normalise a bit so the front-end is happy
    const trade = {
      pair: parsed.pair || '',
      date: parsed.date || todayStr,
      direction: parsed.direction || '',
      session: parsed.session || '',            // optional if you decide to add in prompt later
      entry_time: parsed.entry_time || null,
      exit_time: parsed.exit_time || null,
      pnl: typeof parsed.pnl === 'number' ? parsed.pnl : 0,
      r:
        typeof parsed.r === 'number'
          ? parsed.r
          : parsed.r
          ? parseFloat(parsed.r)
          : null,
      risk_pct:
        typeof parsed.risk_pct === 'number'
          ? parsed.risk_pct
          : parsed.risk_pct
          ? parseFloat(parsed.risk_pct)
          : null,
      strategy: parsed.strategy || '',
      exec: parsed.exec || '',
      grade: parsed.grade || '',
      notes: parsed.notes || '',
    };

    res.json({ trade });
  } catch (err) {
    console.error('AI error on /ai-log-trade:', err);
    res.status(500).json({
      error: 'AI log failed',
      details: err.message || String(err),
    });
  }
});
