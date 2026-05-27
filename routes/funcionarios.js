const router  = require('express').Router();
const db      = require('../db');

// ── Funcionarios ─────────────────────────────────────────────

// GET /api/funcionarios
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        f.idFuncionario,
        f.nombreCompleto,
        f.correoElectronico,
        f.telefono,
        f.cargo,
        f.idUsuario,
        un.nombreUnidad
       FROM funcionario f
       LEFT JOIN tramite t  ON t.idUnidad = f.idFuncionario
       LEFT JOIN unidad un  ON un.idUnidad = f.idFuncionario
       ORDER BY f.nombreCompleto ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/funcionarios/:id/carga  — llama al cursor 2
router.get('/:id/carga', async (req, res, next) => {
  try {
    const [result] = await db.query(
      'CALL sp_reporte_carga_funcionario(?)', [req.params.id]
    );
    res.json(result[0][0] || {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
