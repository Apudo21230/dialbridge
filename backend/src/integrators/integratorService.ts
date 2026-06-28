import type { IntegratorRepository } from './integratorRepository.js';
import { generateApiKey, hashApiKey } from '../auth/apiKey.js';
import { verifyClientToken } from '../auth/clientToken.js';

export type AuthResult = { integratorId: string } | { suspended: true } | undefined;

export class IntegratorService {
  constructor(private readonly repo: IntegratorRepository) {}

  /** Create an integrator and issue its first API key. Raw key returned ONCE. */
  async onboard(name: string): Promise<{ integratorId: string; apiKey: string; keyId: string }> {
    const integrator = await this.repo.create(name);
    const { raw, hash, prefix } = generateApiKey();
    const key = await this.repo.addApiKey(integrator.id, hash, prefix, 'default');
    return { integratorId: integrator.id, apiKey: raw, keyId: key.id };
  }

  /** Issue an additional key for an existing integrator (rotation). Raw key returned ONCE. */
  async issueKey(integratorId: string, label = 'default'): Promise<{ apiKey: string; keyId: string; prefix: string }> {
    const { raw, hash, prefix } = generateApiKey();
    const key = await this.repo.addApiKey(integratorId, hash, prefix, label);
    return { apiKey: raw, keyId: key.id, prefix };
  }

  async authenticate(rawKey: string): Promise<AuthResult> {
    const found = await this.repo.findKeyWithIntegrator(hashApiKey(rawKey));
    if (!found) return undefined;
    if (found.integrator.status !== 'active') return { suspended: true };
    void this.repo.touchApiKey(found.key.id); // lazy last_used_at (fire-and-forget)
    return { integratorId: found.integrator.id };
  }

  /** Authenticate a client token (minted via /client-tokens). Re-checks the integrator is active. */
  async authenticateClientToken(token: string): Promise<AuthResult> {
    const claims = verifyClientToken(token);
    if (!claims) return undefined;
    const integrator = await this.repo.findById(claims.integratorId);
    if (!integrator) return undefined;
    if (integrator.status !== 'active') return { suspended: true };
    return { integratorId: integrator.id };
  }
}
