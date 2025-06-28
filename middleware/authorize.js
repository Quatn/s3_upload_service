import jwt from 'jsonwebtoken';
import { SUPABASE_JWT_SECRET } from '../config/env.js';

export default function authorize(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
    req.user = payload; // contains sub (user id), email, role, etc.
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
