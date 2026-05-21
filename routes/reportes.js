const router = require('express').Router();
const db     = require('../db');

// GET /api/reportes/tramites
// Llama a sp_reporte_tramites() — solicitudes agrupadas por estado
router.get('/tramites', async (req, res, next) => {
  try {
    const [result] = await db.query('CALL sp_reporte_tramites()');
    res.json(result[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/reportes/pendientes?dias=7
// Llama a sp_reporte_solicitudes_pendientes() — cursor 1
router.get('/pendientes', async (req, res, next) => {
  try {
    const dias = parseInt(req.query.dias) || 7;
    const [result] = await db.query(
      'CALL sp_reporte_solicitudes_pendientes(?)', [dias]
    );
    res.json(result[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/reportes/escalar?dias=30
// Llama a sp_escalar_solicitudes_vencidas() — cursor 3
router.post('/escalar', async (req, res, next) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const [result] = await db.query(
      'CALL sp_escalar_solicitudes_vencidas(?)', [dias]
    );
    res.json(result[0][0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
