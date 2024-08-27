const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../DBHandler');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const COOKIE_MAX_AGE = process.env.COOKIE_MAX_AGE || 3600000; 

const signup = async (req, res) => {
    const { fullname, email, password, phone, role } = req.body;
  
    try {
      const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
      db.query(checkEmailQuery, [email], async (checkErr, checkResults) => {
        if (checkErr) {
          return res.status(500).json({ error: 'Error checking email' });
        }
  
        if (checkResults.length > 0) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (fullname, email, password, phone, role) VALUES (?, ?, ?, ?)';
        db.query(insertQuery, [fullname, email, hashedPassword, role], (insertErr, result) => {
          if (insertErr) {
            return res.status(500).json({ error: 'Error creating user' });
          }
          res.status(201).json({ message: 'User created successfully' });
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Error creating user' });
    }
  };
  

const signin = (req, res) => {
  const { email, password } = req.body;


  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Error during sign-in' });
    } else if (results.length === 0) {
      res.status(401).json({ error: 'Email Not Registered' });
    } else {
      const user = results[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: parseInt(COOKIE_MAX_AGE) 
        });

        res.json({ message: 'Signed in successfully' });
      } else {
        res.status(401).json({ error: 'Wrong Password' });
      }
    }
  });
};

const getUser = async (req, res) => {
    try {
      const userId = req.userId;
  
      const query = 'SELECT fullname,role FROM users WHERE id = ?';
      db.query(query, [userId], (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ message: "User not found!" });
        }
  
        res.json({ fullname: results[0].fullname, role: results[0].role });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

const signout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Signed out successfully' });
};

module.exports={ signup, signin, signout, getUser };
