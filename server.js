// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

    console.log(
      'Trades count:',
      Array.isArray(payload?.trades) ? payload.trades.length : 0
    );

    const prompt = `
You are a trading performance coach.

Return a JSON object with this exact shape:

{
  "overall_summary": {
    "grade": "string like B-",
    "headline": "one-line summary",
    "pnl_summary": {
      "total_pnl": number,
      "total_r": number,
      "win_rate": number
    }
  },
  "strengths": ["string", "string"],
  "weaknesses": ["string"],
  "rules_for_next_10_trades": ["string", "string"],
  "patterns": {
    "best_setups": [{ "label": "string", "avg_r": number, "count": number }],
    "worst_setups": [{ "label": "string", "avg_r": number, "count": number }]
  }
}

Trader data to analyze (may be partial or empty):
${JSON.stringify(payload)}
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are an expert trading performance coach. Respond ONLY with valid JSON matching the requested shape.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

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
