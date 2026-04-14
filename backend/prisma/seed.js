const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.course.createMany({
    data: [
      { name: "Plastic Product Design", description: "CATIA surfacing and modeling" },
      { name: "BIW Product Design", description: "Body in White design" },
      { name: "UG NX Product Design", description: "Siemens NX modeling" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Courses seeded");
}

main().catch(console.error).finally(() => prisma.$disconnect());