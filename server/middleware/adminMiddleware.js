module.exports = (req, res, next) => {
  if (!req.officer) return res.status(401).json({ error: 'Unauthorized' });
  if (!['admin', 'district_collector'].includes(req.officer.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
