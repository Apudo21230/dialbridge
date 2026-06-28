import type { UserRepository } from '../users/userRepository.js';
import type { UserRow } from '../db/schema.js';
import { hashPassword, verifyPassword } from './password.js';
import { signToken } from './token.js';

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async signupEmail(input: { email: string; password: string; role?: string }): Promise<{ user: UserRow; token: string }> {
    if (await this.users.findByEmail(input.email)) {
      throw new Error('email already in use');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({ email: input.email, passwordHash, role: input.role ?? 'fan' });
    return { user, token: signToken({ sub: user.id, role: user.role }) };
  }

  async loginEmail(input: { email: string; password: string }): Promise<{ user: UserRow; token: string }> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new Error('invalid credentials');
    }
    return { user, token: signToken({ sub: user.id, role: user.role }) };
  }

  async loginWithPhone(phone: string): Promise<{ user: UserRow; token: string }> {
    const existing = await this.users.findByPhone(phone);
    const user = existing ?? (await this.users.create({ phone, role: 'fan' }));
    return { user, token: signToken({ sub: user.id, role: user.role }) };
  }
}
