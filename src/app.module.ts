import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ClubesModule } from './clubes/clubes.module';
import { CoreModule } from './core/core.module';
import { EquiposTorneoModule } from './equipos-torneo/equipos-torneo.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { PasesModule } from './pases/pases.module';
import { PartidosModule } from './partidos/partidos.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { SuspensionesModule } from './suspensiones/suspensiones.module';
import { TorneosModule } from './torneos/torneos.module';
import { UsersModule } from './users/users.module';
import { DbKeepAliveService } from './keepalive/db-keepalive.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CoreModule,
    AuthModule,
    UsersModule,
    RolesModule,
    JugadoresModule,
    PasesModule,
    ClubesModule,
    TorneosModule,
    EquiposTorneoModule,
    InscripcionesModule,
    PartidosModule,
    SuspensionesModule,
    EstadisticasModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    DbKeepAliveService,
  ],
})
export class AppModule {}
