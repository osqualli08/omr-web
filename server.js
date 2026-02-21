const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const dbFile = path.join(__dirname, 'students.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to SQLite database');
});

// Create students table
db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    firstname TEXT NOT NULL,
    age INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE,
    filiere TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating users table:', err.message);
  
  const defaultEmail = 'omar@esisa.ac';
  const defaultPassword = '123456@';
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  
  db.get('SELECT id FROM users WHERE email = ?', [defaultEmail], (err, row) => {
    if (!row) {
      db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
        ['Omar', defaultEmail, hashedPassword], 
        (err) => {
          if (!err) console.log('Admin user created: omar@esisa.ac');
        }
      );
    }
  });
});

// ============ AUTH ROUTES ============

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});

app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

// ============ STATISTICS ROUTES ============

app.get('/api/statistics', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM students', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const total = row.total;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    db.get(
      "SELECT COUNT(*) as thisMonth FROM students WHERE strftime('%Y-%m', created_at) = ?",
      [currentMonth],
      (err, row2) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(DISTINCT filiere) as filieres FROM students', [], (err, row3) => {
          res.json({
            total: total,
            thisMonth: row2.thisMonth,
            filieres: row3.filieres || 0
          });
        });
      }
    );
  });
});

// ============ STUDENTS ROUTES ============

app.get('/api/filieres', (req, res) => {
  db.all('SELECT DISTINCT filiere FROM students ORDER BY filiere', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.filiere));
  });
});

app.get('/api/students', (req, res) => {
  const { 
    search = '', 
    filiere = '', 
    sortBy = 'created_at', 
    sortOrder = 'DESC',
    page = 1,
    limit = 10
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let conditions = [];
  let params = [];
  
  if (search) {
    conditions.push('(name LIKE ? OR firstname LIKE ? OR email LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (filiere) {
    conditions.push('filiere = ?');
    params.push(filiere);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  
  const countQuery = `SELECT COUNT(*) as total FROM students ${whereClause}`;
  db.get(countQuery, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const total = row.total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    const validSortColumns = ['id', 'name', 'firstname', 'age', 'email', 'filiere', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const dataQuery = `SELECT * FROM students ${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`;
    const dataParams = [...params, parseInt(limit), offset];
    
    db.all(dataQuery, dataParams, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        students: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      });
    });
  });
});

app.get('/api/students/export', (req, res) => {
  const { search = '', filiere = '' } = req.query;
  
  let conditions = [];
  let params = [];
  
  if (search) {
    conditions.push('(name LIKE ? OR firstname LIKE ? OR email LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (filiere) {
    conditions.push('filiere = ?');
    params.push(filiere);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `SELECT * FROM students ${whereClause} ORDER BY created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const headers = ['ID', 'Nom', 'Prénom', 'Âge', 'Email', 'Filière', 'Date d\'ajout'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(student => {
      const row = [
        student.id,
        `"${student.name}"`,
        `"${student.firstname}"`,
        student.age,
        `"${student.email}"`,
        `"${student.filiere}"`,
        `"${student.created_at}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=etudiants.csv');
    res.send(csv);
  });
});

app.post('/api/students', (req, res) => {
  const { name, firstname, age, email, filiere } = req.body;
  if (!name || !firstname || !age || !email || !filiere) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  
  const stmt = db.prepare('INSERT INTO students (name, firstname, age, email, filiere) VALUES (?, ?, ?, ?, ?)');
  stmt.run([name, firstname, age, email, filiere], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Cet email existe déjà' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name, firstname, age, email, filiere });
  });
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, firstname, age, email, filiere } = req.body;
  if (!name || !firstname || !age || !email || !filiere) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  db.run(
    'UPDATE students SET name = ?, firstname = ?, age = ?, email = ?, filiere = ? WHERE id = ?',
    [name, firstname, age, email, filiere, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Cet email existe déjà pour un autre étudiant' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Étudiant non trouvé' });
      res.json({ id, name, firstname, age, email, filiere });
    }
  );
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM students WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Étudiant non trouvé' });
    res.json({ success: true });
  });
});

// ============ FRONTEND ROUTES ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
