const { db } = require('../_firebase');
const { verifyToken, getTokenFromReq, cors } = require('../_helpers');

async function requireAdmin(req, res) {
  const token = getTokenFromReq(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Token invalid' }); return null; }
  const doc = await db.collection('users').doc(payload.username).get();
  if (!doc.exists || doc.data().role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return null; }
  return payload;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET is public (needed for frontend branding)
  if (req.method === 'GET') {
    const doc = await db.collection('settings').doc('global').get();
    const data = doc.exists ? doc.data() : {};
    // strip sensitive fields for public
    const { systemPrompt: _sp, ...pub } = data;
    return res.status(200).json(pub);
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'POST') {
    const allowed = [
      'aiName', 'bgColor', 'bgImage', 'defaultLimit',
      'systemPrompt', 'pricing', 'authorName',
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    await db.collection('settings').doc('global').set(update, { merge: true });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
