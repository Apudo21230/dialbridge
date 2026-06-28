import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://apple@localhost:5432/dialbridge_dev',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  adminSecret: process.env.ADMIN_SECRET ?? 'dev-admin-secret',
  port: Number(process.env.PORT ?? 3000),
};
