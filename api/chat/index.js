const { db } = require('../_firebase');
const { verifyToken, getTokenFromReq, cors } = require('../_helpers');

const MODELS = {
  low: 'claude-haiku-4-5-20251001',
  super: 'claude-sonnet-4-6',
};

const SYSTEM_BASE = `Kamu adalah {AI_NAME}, asisten analisis trading profesional yang dibuat by ridwan.
Kamu HANYA boleh membahas topik seputar trading dan investasi:
- Analisis teknikal & fundamental
- Saham, forex, cryptocurrency, komoditas
- Indikator trading (RSI, MACD, Bollinger Bands, EMA, dll)
- Strategi trading, entry/exit point, risk management
- Psikologi trading, money management
- Pembacaan chart, pola candlestick
- Kondisi makroekonomi yang mempengaruhi pasar
- Jika pengguna mengirim screenshot/gambar chart, analisis dengan detail.

Jika ditanya di luar topik trading dan investasi, tolak dengan sopan dan arahkan kembali ke trading.
Jawab dalam Bahasa Indonesia yang profesional dan mudah dipahami.`;

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalid' });

  try {
    const { messages, model: modelKey, imageBase64 } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'Messages required' });

    const userDoc = await db.collection('users').doc(payload.username).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const user = userDoc.data();
    if (user.status === 'banned') return res.status(403).json({ error: 'Akun diblokir.' });

    // Plan check for model
    const requestedModel = modelKey || 'low';
    if (requestedModel === 'super' && user.plan !== 'super' && user.role !== 'admin')
      return res.status(403).json({ error: 'LUBRIX SUPER THINKING membutuhkan paket Super. Upgrade di halaman akun.' });

    // Daily limit check (admin bypass)
    const today = new Date().toISOString().split('T')[0];
    let usedToday = user.usedToday ?? 0;
    if (user.lastResetDate !== today) usedToday = 0;

    if (user.role !== 'admin' && usedToday >= (user.dailyLimit ?? 5))
      return res.status(429).json({ error: 'Limit harian habis. Coba lagi besok atau upgrade plan.' });

    // Get settings
    const settingsDoc = await db.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const aiName = settings.aiName || 'LUBRIX AI';
    const systemPrompt = (settings.systemPrompt || SYSTEM_BASE).replace('{AI_NAME}', aiName);
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Build messages for Anthropic
    const apiMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user' && imageBase64) {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageBase64.mediaType || 'image/jpeg', data: imageBase64.data },
            },
            { type: 'text', text: m.content },
          ],
        };
      }
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
    });

    const useThinking = requestedModel === 'super';
    const anthropicModel = useThinking ? MODELS.super : MODELS.low;

    const body = {
      model: anthropicModel,
      max_tokens: useThinking ? 16000 : 1500,
      system: systemPrompt,
      messages: apiMessages,
    };
    if (useThinking) {
      body.thinking = { type: 'enabled', budget_tokens: 10000 };
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': useThinking ? 'interleaved-thinking-2025-05-14' : undefined,
      },
      body: JSON.stringify(body),
    });

    const data = await aiRes.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let thinkingContent = null;
    let textContent = '';
    for (const block of data.content || []) {
      if (block.type === 'thinking') thinkingContent = block.thinking;
      if (block.type === 'text') textContent += block.text;
    }

    // Increment usage
    const newUsed = usedToday + 1;
    await db.collection('users').doc(payload.username).update({
      usedToday: newUsed,
      lastResetDate: today,
    });

    return res.status(200).json({
      reply: textContent,
      thinking: thinkingContent,
      usedToday: newUsed,
      dailyLimit: user.dailyLimit ?? 5,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
