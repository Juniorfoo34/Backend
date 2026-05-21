const router = require('express').Router();
const db     = require('../db');

// GET /api/solicitudes
router.get('/', async (req, res, next) => {
  try {
    const { idUsuario, idFuncionario, idEstado } = req.query;

    let sql = `
      SELECT
        s.idSolicitud,
        s.descripcion,
        s.adjuntoPdf,
        s.fechaCreacion,
        s.idUsuario,
        CONCAT(u.nombre, ' ', u.apellido) AS nombreUsuario,
        s.idTramite,
        t.tipoTramite,
        t.requierePago,
        s.idFuncionario,
        f.nombreCompleto AS nombreFuncionario,
        s.idEstadoActual,
        e.nombreEstado
      FROM Solicitud s
      JOIN Usuario u         ON s.idUsuario       = u.idUsuario
      JOIN Tramite t         ON s.idTramite        = t.idTramite
      JOIN Funcionario f     ON s.idFuncionario    = f.idFuncionario
      JOIN EstadoSolicitud e ON s.idEstadoActual   = e.idEstado
      WHERE 1=1
    `;
    const params = [];

    if (idUsuario) {
      sql += ' AND s.idUsuario = ?';
      params.push(idUsuario);
    }
    if (idFuncionario) {
      sql += ' AND s.idFuncionario = ?';
      params.push(idFuncionario);
    }
    if (idEstado) {
      sql += ' AND s.idEstadoActual = ?';
      params.push(idEstado);
    }

    sql += ' ORDER BY s.fechaCreacion DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/solicitudes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        s.idSolicitud,
        s.descripcion,
        s.adjuntoPdf,
        s.fechaCreacion,
        s.idUsuario,
        CONCAT(u.nombre, ' ', u.apellido) AS nombreUsuario,
        u.correoElectronico AS correoUsuario,
        s.idTramite,
        t.tipoTramite,
        t.descripcion AS descripcionTramite,
        t.normativa,
        t.requierePago,
        un.nombreUnidad,
        s.idFuncionario,
        f.nombreCompleto AS nombreFuncionario,
        f.cargo,
        s.idEstadoActual,
        e.nombreEstado,
        fn_tiene_pago(s.idSolicitud) AS tienePago
       FROM Solicitud s
       JOIN Usuario u         ON s.idUsuario     = u.idUsuario
       JOIN Tramite t         ON s.idTramite      = t.idTramite
       JOIN Unidad un         ON t.idUnidad       = un.idUnidad
       JOIN Funcionario f     ON s.idFuncionario  = f.idFuncionario
       JOIN EstadoSolicitud e ON s.idEstadoActual = e.idEstado
       WHERE s.idSolicitud = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/solicitudes
router.post('/', async (req, res, next) => {
  try {
    const { descripcion, idUsuario, idTramite, idFuncionario } = req.body;

    if (!idUsuario || !idTramite || !idFuncionario) {
      return res.status(400).json({ error: 'idUsuario, idTramite e idFuncionario son requeridos' });
    }

    const [result] = await db.query(
      'CALL sp_crear_solicitud(?, ?, ?, ?)',
      [descripcion || null, idUsuario, idTramite, idFuncionario]
    );

    const idSolicitud = result[0][0].idSolicitud;
    res.status(201).json({ message: 'Solicitud creada', idSolicitud });
  } catch (err) {
    next(err);
  }
});

// PUT /api/solicitudes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { descripcion, idFuncionario } = req.body;
    const { id } = req.params;

    const [check] = await db.query(
      'SELECT idSolicitud FROM Solicitud WHERE idSolicitud = ?', [id]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await db.query(
      'UPDATE Solicitud SET descripcion = ?, idFuncionario = ? WHERE idSolicitud = ?',
      [descripcion, idFuncionario, id]
    );

    res.json({ message: 'Solicitud actualizada' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/solicitudes/:id/estado
router.patch('/:id/estado', async (req, res, next) => {
  try {
    const { idEstado, idFuncionario } = req.body;
    const { id } = req.params;

    if (!idEstado || !idFuncionario) {
      return res.status(400).json({ error: 'idEstado e idFuncionario son requeridos' });
    }

    const [check] = await db.query(
      'SELECT idSolicitud FROM Solicitud WHERE idSolicitud = ?', [id]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await db.query('CALL sp_cambiar_estado(?, ?, ?)', [id, idEstado, idFuncionario]);

    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/solicitudes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [check] = await db.query(
      'SELECT idSolicitud, idEstadoActual FROM Solicitud WHERE idSolicitud = ?',
      [req.params.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Eliminar dependencias en orden correcto
    await db.query('DELETE FROM AdjuntoComentario WHERE idComentario IN (SELECT idComentario FROM Comentario WHERE idSolicitud = ?)', [req.params.id]);
    await db.query('DELETE FROM Comentario       WHERE idSolicitud = ?', [req.params.id]);
    await db.query('DELETE FROM Documento        WHERE idSolicitud = ?', [req.params.id]);
    await db.query('DELETE FROM Pago             WHERE idSolicitud = ?', [req.params.id]);
    await db.query('DELETE FROM HistorialEstado  WHERE idSolicitud = ?', [req.params.id]);
    await db.query('DELETE FROM Solicitud        WHERE idSolicitud = ?', [req.params.id]);

    res.json({ message: 'Solicitud eliminada' });
  } catch (err) {
    next(err);
  }
});

// GET /api/solicitudes/:id/historial
router.get('/:id/historial', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        h.idHistorial,
        h.fechaCambio,
        e.nombreEstado,
        f.nombreCompleto AS nombreFuncionario
       FROM HistorialEstado h
       JOIN EstadoSolicitud e ON h.idEstado      = e.idEstado
       JOIN Funcionario f     ON h.idFuncionario = f.idFuncionario
       WHERE h.idSolicitud = ?
       ORDER BY h.fechaCambio ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/solicitudes/:id/comentarios
router.get('/:id/comentarios', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        c.idComentario,
        c.texto,
        c.fechaComentario,
        COALESCE(CONCAT(u.nombre, ' ', u.apellido), f.nombreCompleto) AS autor,
        CASE WHEN c.idFuncionario IS NOT NULL THEN 'funcionario' ELSE 'usuario' END AS tipoAutor,
        a.archivo AS adjunto
       FROM Comentario c
       LEFT JOIN Usuario    u ON c.idUsuario    = u.idUsuario
       LEFT JOIN Funcionario f ON c.idFuncionario = f.idFuncionario
       LEFT JOIN AdjuntoComentario a ON a.idComentario = c.idComentario
       WHERE c.idSolicitud = ?
       ORDER BY c.fechaComentario ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/solicitudes/:id/comentarios
router.post('/:id/comentarios', async (req, res, next) => {
  try {
    const { texto, idFuncionario, idUsuario } = req.body;
    const { id } = req.params;

    if (!texto) {
      return res.status(400).json({ error: 'El texto del comentario es requerido' });
    }
    if (!idFuncionario && !idUsuario) {
      return res.status(400).json({ error: 'Se requiere idFuncionario o idUsuario' });
    }

    const [result] = await db.query(
      `INSERT INTO Comentario (texto, fechaComentario, idSolicitud, idFuncionario, idUsuario)
       VALUES (?, CURRENT_DATE, ?, ?, ?)`,
      [texto, id, idFuncionario || null, idUsuario || null]
    );

    res.status(201).json({ message: 'Comentario agregado', idComentario: result.insertId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
