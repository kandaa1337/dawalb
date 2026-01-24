import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.country.create({ data: { name: "Lebanon", iso2: "LB" } });
  console.log("Created country:", c);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
