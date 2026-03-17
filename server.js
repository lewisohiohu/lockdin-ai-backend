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
