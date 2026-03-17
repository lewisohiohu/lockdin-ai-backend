// server.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.send('LockdIn AI backend is running');
});

// Dummy AI Review endpoint
app.post('/ai-review', (req, res) => {
  console.log('Received /ai-review payload');
  const payload = req.body;

  console.log(
    'Trades count:',
    Array.isArray(payload?.trades) ? payload.trades.length : 0
  );

  // This is the DUMMY RESPONSE (fake AI)
  const dummy = {
    overall_summary: {
      grade: 'B-',
      headline:
        'Dummy AI: You are strong on London A-class trades, weak on revenge trades.',
      pnl_summary: {
        total_pnl: 0,
        total_r: 0,
        win_rate: 0
      }
    },
    strengths: [
      'This is a dummy AI response so you can test the UI.',
      'Once you add a real key, this can be replaced with real analysis.'
    ],
    weaknesses: ['None yet — dummy mode.'],
    rules_for_next_10_trades: [
      'Only take your highest conviction setups.',
      'Stop trading for the day after -3R.'
    ],
    patterns: {
      best_setups: [{ label: 'London sweep + HTF OB', avg_r: 2.4, count: 3 }],
      worst_setups: [{ label: 'NY revenge chase', avg_r: -1.1, count: 2 }]
    }
  };

  res.json(dummy);
});

app.listen(PORT, () => {
  console.log(`LockdIn AI backend listening on http://localhost:${PORT}`);
});
