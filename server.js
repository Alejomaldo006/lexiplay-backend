const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json());

const db = mysql.createConnection(process.env.MYSQL_URL || {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.error("Error conectando a MySQL:", err.message);
  else console.log("Conectado a MySQL correctamente");
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT id, nombre, email, rol FROM usuarios WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Error del servidor" });
      if (results.length === 0) return res.json({ success: false, message: "Usuario o contrasena incorrectos" });
      res.json({ success: true, user: results[0] });
    }
  );
});

app.post("/api/registro", (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) return res.json({ success: false, message: "Todos los campos son obligatorios" });
  db.query("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'usuario')",
    [nombre, email, password],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.json({ success: false, message: "Este email ya esta registrado" });
        return res.status(500).json({ success: false });
      }
      db.query("SELECT id, nombre, email, rol FROM usuarios WHERE id = ?", [result.insertId], (err2, rows) => {
        res.json({ success: true, user: rows[0] });
      });
    }
  );
});

app.post("/api/progreso", (req, res) => {
  const { usuario_id, ejercicio_id, puntaje } = req.body;
  db.query(
    "INSERT INTO progreso (usuario_id, ejercicio_id, puntaje, completado) VALUES (?, ?, ?, true) ON DUPLICATE KEY UPDATE puntaje = GREATEST(puntaje, ?), completado = true",
    [usuario_id, ejercicio_id, puntaje, puntaje],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/progreso/:usuario_id", (req, res) => {
  db.query("SELECT ejercicio_id, puntaje, completado FROM progreso WHERE usuario_id = ?",
    [req.params.usuario_id],
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

app.get("/api/admin/usuarios", (req, res) => {
  db.query("SELECT id, nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC",
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

app.get("/api/admin/progreso", (req, res) => {
  db.query(
    "SELECT u.id, u.nombre, u.email, COALESCE(SUM(p.puntaje), 0) as puntaje_total, COALESCE(COUNT(p.id), 0) as ejercicios_completados FROM usuarios u LEFT JOIN progreso p ON u.id = p.usuario_id AND p.completado = true WHERE u.rol = 'usuario' GROUP BY u.id ORDER BY puntaje_total DESC",
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

app.get("/api/admin/progreso/:usuario_id", (req, res) => {
  db.query("SELECT ejercicio_id, puntaje, completado, fecha FROM progreso WHERE usuario_id = ? ORDER BY ejercicio_id",
    [req.params.usuario_id],
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

app.delete("/api/admin/usuarios/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM progreso WHERE usuario_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ success: false });
    db.query("DELETE FROM usuarios WHERE id = ? AND rol != 'admin'", [id], (err2) => {
      if (err2) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
