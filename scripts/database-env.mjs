// Vercel integrations may prefix the connection variables with a resource name.
export function configureDatabaseEnvironment(environment = process.env) {
  const current = environment.DATABASE_URL;
  const hosted = environment.VERCEL === "1";
  if (current && (!hosted || /^postgres(ql)?:/.test(current))) return;
  const integrationUrl = environment.QUIZ_LAB_POSTGRES_URL ?? environment.QUIZ_LAB_PRISMA_DATABASE_URL;
  if (integrationUrl && /^postgres(ql)?:/.test(integrationUrl)) {
    environment.DATABASE_URL = integrationUrl;
  }
}
