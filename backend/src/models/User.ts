import db from '../database/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export class UserModel {
  static async create(input: CreateUserInput): Promise<User> {
    const passwordHash = bcrypt.hashSync(input.password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    
    const result = await stmt.run(
      input.username,
      input.email,
      passwordHash
    );

    return (await this.findById(result.lastInsertRowid))!;
  }

  static async findById(id: number): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return (await stmt.get(id)) as User | null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return (await stmt.get(username)) as User | null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return (await stmt.get(email)) as User | null;
  }

  static verifyPassword(user: User, password: string): boolean {
    return bcrypt.compareSync(password, user.password_hash);
  }
}
