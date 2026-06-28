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

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // GET: list all users
  if (req.method === 'GET') {
    const snap = await db.collection('users').get();
    const users = snap.docs.map(d => {
      const u = d.data();
      return {
        username: u.username, email: u.email,
        role: u.role, status: u.status,
        plan: u.plan || 'free',
        dailyLimit: u.dailyLimit ?? 5,
        usedToday: u.usedToday ?? 0,
        joinedAt: u.joinedAt,
        lastResetDate: u.lastResetDate,
        // NEVER expose password
      };
    });
    return res.status(200).json({ users });
  }

  // PUT: update user
  if (req.method === 'PUT') {
    const { username, role, status, dailyLimit, plan, newPassword } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const update = {};
    if (role !== undefined) update.role = role;
    if (status !== undefined) update.status = status;
    if (dailyLimit !== undefined) update.dailyLimit = Math.max(5, parseInt(dailyLimit));
    if (plan !== undefined) update.plan = plan;
    if (newPassword) {
      const { hashPassword } = require('../_helpers');
      update.password = hashPassword(newPassword);
    }
    await db.collection('users').doc(username).update(update);
    return res.status(200).json({ ok: true });
  }

  // DELETE: remove user
  if (req.method === 'DELETE') {
    const { username } = req.body;
    if (!username || username === 'admin') return res.status(400).json({ error: 'Cannot delete this user' });
    await db.collection('users').doc(username).delete();
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
