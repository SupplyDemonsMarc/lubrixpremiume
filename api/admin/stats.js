const { db } = require('../_firebase');
const { verifyToken, getTokenFromReq, cors } = require('../_helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalid' });
  const doc = await db.collection('users').doc(payload.username).get();
  if (!doc.exists || doc.data().role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const snap = await db.collection('users').get();
  const users = snap.docs.map(d => d.data());
  return res.status(200).json({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    banned: users.filter(u => u.status === 'banned').length,
    planFree: users.filter(u => (u.plan || 'free') === 'free').length,
    planSuper: users.filter(u => u.plan === 'super').length,
    admins: users.filter(u => u.role === 'admin').length,
  });
};
