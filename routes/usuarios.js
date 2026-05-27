const router = require('express').Router();
const db     = require('../db');

// GET /api/usuarios
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        u.idUsuario,
        u.nombre,
        u.apellido,
        u.correoElectronico,
        u.telefono,
        u.fechaRegistro,
        u.idTipoUsuario,
        t.nombreTipoUsuario,
        fn_total_solicitudes_usuario(u.idUsuario) AS totalSolicitudes
       FROM usuario u
       JOIN tipousuario t ON u.idTipoUsuario = t.idTipoUsuario
       ORDER BY u.apellido ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/usuarios/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        u.idUsuario, u.nombre, u.apellido,
        u.correoElectronico, u.telefono, u.fechaRegistro,
        u.idTipoUsuario, t.nombreTipoUsuario,
        fn_total_solicitudes_usuario(u.idUsuario) AS totalSolicitudes
       FROM usuario u
       JOIN tipousuario t ON u.idTipoUsuario = t.idTipoUsuario
       WHERE u.idUsuario = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/usuarios
router.post('/', async (req, res, next) => {
  try {
    const { nombre, apellido, correoElectronico, telefono, contrasena, idTipoUsuario } = req.body;

    if (!nombre || !apellido || !correoElectronico || !contrasena || !idTipoUsuario) {
      return res.status(400).json({ error: 'nombre, apellido, correoElectronico, contrasena e idTipoUsuario son requeridos' });
    }

    const [dup] = await db.query(
      'SELECT idUsuario FROM usuario WHERE correoElectronico = ?', [correoElectronico]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const [result] = await db.query(
      `INSERT INTO usuario (nombre, apellido, correoElectronico, telefono, contrasena, fechaRegistro, idTipoUsuario)
       VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)`,
      [nombre, apellido, correoElectronico, telefono || null, contrasena, idTipoUsuario]
    );

    res.status(201).json({ message: 'Usuario creado', idUsuario: result.insertId });
  } catch (err) {
    next(err);
  }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, apellido, telefono, idTipoUsuario } = req.body;
    const { id } = req.params;

    const [check] = await db.query('SELECT idUsuario FROM usuario WHERE idUsuario = ?', [id]);
    if (check.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await db.query(
      'UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, idTipoUsuario = ? WHERE idUsuario = ?',
      [nombre, apellido, telefono || null, idTipoUsuario, id]
    );

    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [check] = await db.query('SELECT idUsuario FROM usuario WHERE idUsuario = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [hasSolicitudes] = await db.query(
      'SELECT COUNT(*) AS total FROM solicitud WHERE idUsuario = ?', [req.params.id]
    );
    if (hasSolicitudes[0].total > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el usuario tiene solicitudes asociadas' });
    }

    await db.query('DELETE FROM usuario WHERE idUsuario = ?', [req.params.id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
