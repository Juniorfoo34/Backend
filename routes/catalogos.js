const router = require('express').Router();
const db     = require('../db');

// GET /api/tramites
router.get('/tramites', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT t.idTramite, t.tipoTramite, t.descripcion,
              t.normativa, t.requierePago, u.nombreUnidad
       FROM Tramite t
       JOIN Unidad u ON t.idUnidad = u.idUnidad
       ORDER BY t.tipoTramite ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/estados
router.get('/estados', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idEstado, nombreEstado FROM EstadoSolicitud ORDER BY idEstado ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/unidades
router.get('/unidades', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idUnidad, nombreUnidad, ubicacion, descripcion FROM Unidad ORDER BY nombreUnidad ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/tipos-usuario
router.get('/tipos-usuario', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idTipoUsuario, nombreTipoUsuario FROM TipoUsuario ORDER BY idTipoUsuario ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
