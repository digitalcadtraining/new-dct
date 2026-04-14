const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const courses = [
    {
      name:             "Plastic Product Design",
      slug:             "plastic-product-design",
      short_name:       "PPD",
      description:      "Master CATIA V5 surfacing and plastic product design for the automotive industry.",
      duration_months:  4,
      price:            15000,
      overview_points:  JSON.stringify(["CATIA V5 fundamentals", "Surface modeling", "Industry projects", "Job assistance"]),
      tools_covered:    JSON.stringify(["CATIA V5", "GD&T", "DMU Kinematics"]),
    },
    {
      name:             "BIW Product Design",
      slug:             "biw-product-design",
      short_name:       "BIW",
      description:      "Learn Body In White design and automotive structural component design.",
      duration_months:  4,
      price:            15000,
      overview_points:  JSON.stringify(["BIW concepts", "Tooling design", "Stamping", "Live projects"]),
      tools_covered:    JSON.stringify(["CATIA V5", "Unigraphics", "AutoCAD"]),
    },
    {
      name:             "UG NX Product Design",
      slug:             "ug-nx-product-design",
      short_name:       "UGNX",
      description:      "Comprehensive Siemens NX training for product design and manufacturing.",
      duration_months:  3,
      price:            12000,
      overview_points:  JSON.stringify(["NX modeling basics", "Advanced surfacing", "Sheet metal", "Industry workflows"]),
      tools_covered:    JSON.stringify(["Siemens NX", "NX CAM", "Teamcenter basics"]),
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where:  { slug: course.slug },
      update: course,
      create: course,
    });
  }

  console.log("✅ 3 courses seeded successfully");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
