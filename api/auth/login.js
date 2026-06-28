const { db } = require('../_firebase');
const { hashPassword, generateToken, cors } = require('../_helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Isi semua kolom.' });

    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return res.status(401).json({ error: 'Username atau password salah.' });

    const user = doc.data();
    if (user.password !== hashPassword(password))
      return res.status(401).json({ error: 'Username atau password salah.' });
    if (user.status === 'banned')
      return res.status(403).json({ error: 'Akun Anda diblokir. Hubungi admin.' });

    // Daily reset check
    const today = new Date().toISOString().split('T')[0];
    let usedToday = user.usedToday ?? 0;
    if (user.lastResetDate !== today) {
      usedToday = 0;
      await db.collection('users').doc(username).update({ usedToday: 0, lastResetDate: today });
    }

    const token = generateToken(username);
    return res.status(200).json({
      token, username,
      role: user.role,
      plan: user.plan || 'free',
      dailyLimit: user.dailyLimit ?? 5,
      usedToday,
      email: user.email,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
};
