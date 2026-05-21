function errorHandler(err, req, res, next) {
  console.error(err);
  const status  = err.status  || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
