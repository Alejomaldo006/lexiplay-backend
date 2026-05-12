const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
  } else {
    console.log('✅ Conectado a MySQL correctamente');
  }
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query(
    'SELECT id, nombre, email FROM usuarios WHERE email = ? AND password = ?',
    [email, password],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Error del servidor' });
      if (results.length === 0) return res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
      res.json({ success: true, user: results[0] });
    }
  );
});

// GUARDAR PROGRESO
app.post('/api/progreso', (req, res) => {
  const { usuario_id, ejercicio_id, puntaje } = req.body;
  db.query(
    `INSERT INTO progreso (usuario_id, ejercicio_id, puntaje, completado)
     VALUES (?, ?, ?, true)
     ON DUPLICATE KEY UPDATE
     puntaje = GREATEST(puntaje, ?), completado = true`,
    [usuario_id, ejercicio_id, puntaje, puntaje],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

// OBTENER PROGRESO
app.get('/api/progreso/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;
  db.query(
    'SELECT ejercicio_id, puntaje, completado FROM progreso WHERE usuario_id = ?',
    [usuario_id],
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

// REGISTRO
app.post('/api/registro', (req, res) => {
  const { nombre, email, password } = req.body;
  db.query(
    'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
    [nombre, email, password],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.json({ success: false, message: 'Este email ya está registrado' });
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, userId: result.insertId });
    }
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));