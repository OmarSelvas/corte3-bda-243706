function authMiddleware(req, _res, next) {
  req.userRole  = req.headers['x-rol']    || 'recepcion';
  req.userVetId = req.headers['x-vet-id'] ? parseInt(req.headers['x-vet-id']) : null;
  next();
}

module.exports = authMiddleware;