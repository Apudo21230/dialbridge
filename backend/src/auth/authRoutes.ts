import { Router } from 'express';
import type { AuthService } from './authService.js';

export function createAuthRouter(service: AuthService): Router {
  const router = Router();

  router.post('/auth/signup', async (req, res) => {
    const { email, password, role } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'email and password (min 6 chars) are required' });
      return;
    }
    try {
      const { user, token } = await service.signupEmail({ email, password, role });
      res.status(201).json({ token, user: { id: user.id, role: user.role } });
    } catch {
      res.status(400).json({ error: 'email already in use' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    try {
      const { user, token } = await service.loginEmail({ email, password });
      res.status(200).json({ token, user: { id: user.id, role: user.role } });
    } catch {
      res.status(401).json({ error: 'invalid credentials' });
    }
  });

  return router;
}
