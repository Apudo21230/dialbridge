import type { IntegratorRepository } from './integratorRepository.js';
import { generateApiKey, hashApiKey } from '../auth/apiKey.js';

export class IntegratorService {
  constructor(private readonly repo: IntegratorRepository) {}

  /** Create an integrator and issue its first API key. The raw key is returned ONCE. */
  async onboard(name: string): Promise<{ integratorId: string; apiKey: string }> {
    const integrator = await this.repo.create(name);
    const { raw, hash, prefix } = generateApiKey();
    await this.repo.addApiKey(integrator.id, hash, prefix);
    return { integratorId: integrator.id, apiKey: raw };
  }

  async authenticate(rawKey: string): Promise<{ id: string } | undefined> {
    const integrator = await this.repo.findIntegratorByKeyHash(hashApiKey(rawKey));
    return integrator ? { id: integrator.id } : undefined;
  }
}
