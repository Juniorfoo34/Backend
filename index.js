require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { errorHandler, notFound } = require('./middleware/errors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
const catalogosRouter    = require('./routes/catalogos');
app.use('/api',                   catalogosRouter);
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/solicitudes',       require('./routes/solicitudes'));
app.use('/api/usuarios',          require('./routes/usuarios'));
app.use('/api/funcionarios',      require('./routes/funcionarios'));
app.use('/api/reportes',          require('./routes/reportes'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
