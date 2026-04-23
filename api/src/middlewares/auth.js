function authMiddleware(req, _res, next) {
  // Obtener rol y vetId de headers
  req.userRole  = req.headers['x-rol']    || 'recepcion';
  req.userVetId = req.headers['x-vet-id'] ? parseInt(req.headers['x-vet-id']) : null;
  
  // Validar que vetId sea número si se proporciona
  if (req.userRole === 'vet' && (!req.userVetId || isNaN(req.userVetId))) {
    console.error('[AUTH ERROR] Vet role sin vetId válido');
    req.userVetId = null;
  }
  
  console.log(`[AUTH] Rol: ${req.userRole}, VetId: ${req.userVetId || 'N/A'}`);
  
  next();
}

module.exports = authMiddleware;