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

export const routes: Routes = [
    { path: '', redirectTo: 'admin/ingresar', pathMatch: 'full' },

    // Login de administrador / docente
    {
        path: 'admin/ingresar',
        component: IngresarAdmin
    },

    // Panel de administración (docente y administrador)
    {
        path: 'admin',
        component: Layout,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['docente', 'administrador'] },
        children: [
            { path: '', redirectTo: 'talleres', pathMatch: 'full' },
            { path: 'talleres', component: Talleres },
            { path: 'mis-talleres', component: MisTalleres },
            { path: 'inscripcion', component: Inscripcion },
            { path: 'mensajes', component: Mensajes },
            { path: 'enrollar', component: Enrollar },

            // Solo administrador
            {
                path: 'usuarios',
                component: Usuarios,
                canActivate: [roleGuard],
                data: { roles: ['administrador'] }
            },
            {
                path: 'reportes',
                component: Reportes,
                canActivate: [roleGuard],
                data: { roles: ['administrador'] }
            },
        ]
    },

    // TODO: sección pública / alumno (etapa siguiente del proyecto)

    { path: '**', component: NoEncontrado }
];
