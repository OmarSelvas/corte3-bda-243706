function authMiddleware(req, _res, next) {
  req.userRole  = req.headers['x-rol']    || 'recepcion';
  req.userVetId = req.headers['x-vet-id'] ? parseInt(req.headers['x-vet-id']) : null;
  
  console.log(`[AUTH] Rol: ${req.userRole}, VetId: ${req.userVetId || 'N/A'}`);
  
  next();
}

module.exports = authMiddleware;