import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/rol.guard';
import { IngresarAdmin } from './componentes/admin/ingresar/ingresar';
import { Layout } from './componentes/admin/layout/layout';
import { Talleres } from './componentes/admin/talleres/talleres';
import { MisTalleres } from './componentes/admin/mis-talleres/mis-talleres';
import { Inscripcion } from './componentes/admin/inscripcion/inscripcion';
import { Mensajes } from './componentes/admin/mensajes/mensajes';
import { Enrollar } from './componentes/admin/enrollar/enrollar';
import { Usuarios } from './componentes/admin/usuarios/usuarios';
import { Reportes } from './componentes/admin/reportes/reportes';
import { NoEncontrado } from './componentes/no-encontrado/no-encontrado';
import { IngresarAlumno } from './componentes/alumno/ingresar/ingresar';
import { RecuperarContrasena } from './componentes/alumno/recuperar-contrasena/recuperar-contrasena';
import { PublicLayoutAlumno } from './componentes/shared-public/public-layout';
import { InicioAlumno } from './componentes/alumno/inicio/inicio';
import { EventosAlumno } from './componentes/alumno/eventos/eventos';
import { ContactoAlumno } from './componentes/alumno/contacto/contacto';
import { DashboardAlumno } from './componentes/alumno/dashboard/dashboard';
import { AnunciosAlumno } from './componentes/alumno/anuncios/anuncios';
import { MensajesAlumno } from './componentes/alumno/mensajes/mensajes';

export const routes: Routes = [
    { path: '', redirectTo: 'ingresar', pathMatch: 'full' },

    // Login y recuperación para alumnos: no muestran el menú ni el footer de las secciones autenticadas.
    { path: 'ingresar', component: IngresarAlumno },
    { path: 'recuperar-contrasena', component: RecuperarContrasena },

    // Acceso separado para Administrador / Docente.
    { path: 'admin/ingresar', component: IngresarAdmin },
    {
        path: 'admin', component: Layout, canActivate: [authGuard, roleGuard],
        data: { roles: ['docente', 'administrador'] },
        children: [
            { path: '', redirectTo: 'talleres', pathMatch: 'full' },
            { path: 'talleres', component: Talleres },
            { path: 'mis-talleres', component: MisTalleres },
            { path: 'inscripcion', component: Inscripcion },
            { path: 'mensajes', component: Mensajes },
            { path: 'enrollar', component: Enrollar },
            { path: 'usuarios', component: Usuarios, canActivate: [roleGuard], data: { roles: ['administrador'] } },
            { path: 'reportes', component: Reportes, canActivate: [roleGuard], data: { roles: ['administrador'] } }
        ]
    },

    {
        // Sitio público visible para alumnos, docentes, administradores y visitantes.
        path: '', component: PublicLayoutAlumno,
        children: [
            { path: 'inicio', component: InicioAlumno },
            { path: 'eventos', component: EventosAlumno },
            { path: 'contacto', component: ContactoAlumno },
            { path: 'alumno/dashboard', component: DashboardAlumno, canActivate: [authGuard, roleGuard], data: { roles: ['alumno'] } },
            { path: 'alumno/anuncios', component: AnunciosAlumno, canActivate: [authGuard, roleGuard], data: { roles: ['alumno'] } },
            { path: 'alumno/mensajes', component: MensajesAlumno, canActivate: [authGuard, roleGuard], data: { roles: ['alumno'] } }
        ]
    },
    { path: '**', component: NoEncontrado }
];
