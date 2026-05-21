const router = require('express').Router();
const db     = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { correoElectronico, contrasena } = req.body;

    if (!correoElectronico || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const [rows] = await db.query(
      `SELECT u.idUsuario, u.nombre, u.apellido, u.correoElectronico,
              u.idTipoUsuario, t.nombreTipoUsuario,
              f.idFuncionario, f.cargo
       FROM Usuario u
       JOIN TipoUsuario t ON u.idTipoUsuario = t.idTipoUsuario
       LEFT JOIN Funcionario f ON f.idUsuario = u.idUsuario
       WHERE u.correoElectronico = ? AND u.contrasena = ?`,
      [correoElectronico, contrasena]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    res.json({ message: 'Login exitoso', user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
