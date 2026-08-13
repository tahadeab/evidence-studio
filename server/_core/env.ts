export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminCode: process.env.ADMIN_CODE ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
