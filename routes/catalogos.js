const router = require('express').Router();
const db     = require('../db');

// GET /api/tramites
router.get('/tramites', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT t.idTramite, t.tipoTramite, t.descripcion,
              t.normativa, t.requierePago, u.nombreUnidad
       FROM tramite t
       JOIN unidad u ON t.idUnidad = u.idUnidad
       ORDER BY t.tipoTramite ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/estados
router.get('/estados', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idEstado, nombreEstado FROM estadosolicitud ORDER BY idEstado ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/unidades
router.get('/unidades', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idUnidad, nombreUnidad, ubicacion, descripcion FROM unidad ORDER BY nombreUnidad ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/tipos-usuario
router.get('/tipos-usuario', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT idTipoUsuario, nombreTipoUsuario FROM tipousuario ORDER BY idTipoUsuario ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
