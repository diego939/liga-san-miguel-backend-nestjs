import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRol = await prisma.rol.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, descripcion: 'ADMIN' },
  });

  await prisma.rol.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, descripcion: 'OPERADOR' },
  });

  const hash = await bcrypt.hash('Admin123!', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@liga.local' },
    update: { password: hash, rolId: adminRol.id },
    create: {
      email: 'admin@liga.local',
      password: hash,
      rolId: adminRol.id,
    },
  });

  console.log('Seed OK: admin@liga.local / Admin123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
