const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where:  { email: "admin@dct.com" },
    update: {},
    create: {
      name:          "DCT Admin",
      email:         "admin@dct.com",
      phone:         "0000000000",
      password_hash: hash,
      role:          "ADMIN",
    },
  });
  console.log("✅ Admin created — email: admin@dct.com  password: admin123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());