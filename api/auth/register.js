const { db } = require('../_firebase');
const { hashPassword, generateToken, cors } = require('../_helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
    if (username.length < 3)
      return res.status(400).json({ error: 'Username minimal 3 karakter.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });

    const existing = await db.collection('users').doc(username).get();
    if (existing.exists) return res.status(400).json({ error: 'Username sudah dipakai.' });

    const settingsDoc = await db.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const defaultLimit = settings.defaultLimit ?? 5;

    const today = new Date().toISOString().split('T')[0];
    await db.collection('users').doc(username).set({
      username, email,
      password: hashPassword(password),
      role: 'user',
      dailyLimit: defaultLimit,
      usedToday: 0,
      lastResetDate: today,
      status: 'active',
      plan: 'free',
      joinedAt: new Date().toISOString(),
    });

    const token = generateToken(username);
    return res.status(200).json({ token, username, role: 'user', plan: 'free', dailyLimit: defaultLimit, usedToday: 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
};
