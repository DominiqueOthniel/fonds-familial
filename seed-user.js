// seed-user.js
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database(path.join(__dirname, "tontine.db"));
const hash = bcrypt.hashSync("MonSuperMdp123", 10);

const insert = db.prepare(`
  INSERT OR IGNORE INTO users (email, password, role) 
  VALUES (?, ?, ?)
`);
insert.run("admin@example.com", hash, "admin");

console.log("✅ Utilisateur seedé : admin@example.com / MonSuperMdp123");
