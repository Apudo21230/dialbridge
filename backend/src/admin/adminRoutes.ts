import { Router } from 'express';
import type { AdminService } from './adminService.js';
import type { AuditRepository } from './auditRepository.js';
import type { IntegratorService } from '../integrators/integratorService.js';
import type { IntegratorRepository } from '../integrators/integratorRepository.js';
import { requireAdmin } from '../auth/requireAdmin.js';

interface IntegratorCreatedAt {
  createdAt: Date;
  id: string;
}

function encodeCursor(row: IntegratorCreatedAt): string {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString('base64url');
}

function decodeCursor(s: string): { createdAt: string; id: string } | undefined {
  try {
    const o = JSON.parse(Buffer.from(s, 'base64url').toString());
    return { createdAt: String(o.createdAt), id: String(o.id) };
  } catch {
    return undefined;
  }
}

export interface AdminRouterDeps {
  adminService: AdminService;
  integratorService: IntegratorService;
  integratorRepo: IntegratorRepository;
  audit: AuditRepository;
}

export function createAdminRouter(deps: AdminRouterDeps): Router {
  const { adminService, integratorService, integratorRepo, audit } = deps;
  const router = Router();

  router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const result = await adminService.login(email, password);
    if (!result) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }
    res.status(200).json(result);
  });

  router.post('/admin/integrators', requireAdmin, async (req, res) => {
    const { name } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name required' });
      return;
    }
    const r = await integratorService.onboard(name.trim());
    await audit.record({
      adminUserId: req.admin!.sub,
      action: 'integrator.create',
      targetType: 'integrator',
      targetId: r.integratorId,
      metadata: { name: name.trim() },
    });
    res.status(201).json({ integratorId: r.integratorId, apiKey: r.apiKey, keyId: r.keyId });
  });

  router.get('/admin/integrators', requireAdmin, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const cursor = typeof req.query.cursor === 'string' ? decodeCursor(req.query.cursor) : undefined;

    const rows = await integratorRepo.list({ limit: limit + 1, cursor, status, search });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    res.status(200).json({
      integrators: page.map((i) => ({ id: i.id, name: i.name, status: i.status, createdAt: i.createdAt })),
      nextCursor,
    });
  });

  router.get('/admin/integrators/:id', requireAdmin, async (req, res) => {
    const integrator = await integratorRepo.findById(req.params.id);
    if (!integrator) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const keys = await integratorRepo.listApiKeys(integrator.id);
    res.status(200).json({
      id: integrator.id,
      name: integrator.name,
      status: integrator.status,
      createdAt: integrator.createdAt,
      keys: keys.map((k) => ({
        id: k.id,
        label: k.label,
        prefix: k.prefix,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
        createdAt: k.createdAt,
      })),
    });
  });

  router.post('/admin/integrators/:id/suspend', requireAdmin, async (req, res) => {
    const updated = await integratorRepo.setStatus(req.params.id, 'suspended');
    if (!updated) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    await audit.record({ adminUserId: req.admin!.sub, action: 'integrator.suspend', targetType: 'integrator', targetId: updated.id });
    res.status(200).json({ id: updated.id, status: updated.status });
  });

  router.post('/admin/integrators/:id/activate', requireAdmin, async (req, res) => {
    const updated = await integratorRepo.setStatus(req.params.id, 'active');
    if (!updated) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    await audit.record({ adminUserId: req.admin!.sub, action: 'integrator.activate', targetType: 'integrator', targetId: updated.id });
    res.status(200).json({ id: updated.id, status: updated.status });
  });

  router.post('/admin/integrators/:id/keys', requireAdmin, async (req, res) => {
    const integrator = await integratorRepo.findById(req.params.id);
    if (!integrator) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const label = typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim() : 'default';
    const r = await integratorService.issueKey(integrator.id, label);
    await audit.record({
      adminUserId: req.admin!.sub,
      action: 'apikey.issue',
      targetType: 'integrator',
      targetId: integrator.id,
      metadata: { keyId: r.keyId, label },
    });
    res.status(201).json({ keyId: r.keyId, apiKey: r.apiKey, prefix: r.prefix, label });
  });

  router.post('/admin/api-keys/:keyId/revoke', requireAdmin, async (req, res) => {
    const revoked = await integratorRepo.revokeApiKey(req.params.keyId);
    if (!revoked) {
      res.status(404).json({ error: 'not found or already revoked' });
      return;
    }
    await audit.record({ adminUserId: req.admin!.sub, action: 'apikey.revoke', targetType: 'api_key', targetId: revoked.id });
    res.status(200).json({ id: revoked.id, revokedAt: revoked.revokedAt });
  });

  return router;
}
