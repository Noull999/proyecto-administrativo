export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }
  next();
};
