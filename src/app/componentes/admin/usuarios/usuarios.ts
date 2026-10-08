import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserEstado, UserRolAdmin, UsuarioAdmin } from '../../../models/usuario-admin';
import { UsuarioAdminService } from '../../../services/usuario-admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  usuarios = signal<UsuarioAdmin[]>([]);
  search = '';
  filtroRol: 'todos' | UserRolAdmin = 'todos';
  filtroEstado: 'todos' | UserEstado = 'todos';
  showFiltros = false;
  loading = false;
  guardando = false;
  error = '';

  // Modal ver/editar
  modalUsuario: UsuarioAdmin | null = null;
  editMode = false;
  editForm!: UsuarioAdmin;
  guardado = false;

  // Modal nuevo docente
  showNuevo = false;
  nuevoForm = { nombres: '', email: '', password: '', telefono: '', institucion: '' };
  creandoDocente = false;
  errorNuevo = '';

  // Modal confirmar suspender/activar
  confirmTarget: UsuarioAdmin | null = null;
  confirmAccion: 'suspender' | 'activar' = 'suspender';
  showConfirm = false;

  exportando = false;

  total = computed(() => this.usuarios().length);
  activos = computed(() => this.usuarios().filter(u => u.activo).length);
  tutores = computed(() => this.usuarios().filter(u => u.rol === 'docente').length);
  suspendidos = computed(() => this.usuarios().filter(u => !u.activo).length);

  constructor(private usuarioService: UsuarioAdminService, public auth: AuthService) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.usuarioService.listar().subscribe({
      next: (data) => { this.loading = false; this.usuarios.set(data); },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudieron cargar los usuarios.';
      }
    });
  }

  filtrados(): UsuarioAdmin[] {
    return this.usuarios().filter(u => {
      const q = this.search.toLowerCase();
      const matchSearch = !q || u.nombres.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRol = this.filtroRol === 'todos' || u.rol === this.filtroRol;
      const estado: UserEstado = u.activo ? 'activo' : 'suspendido';
      const matchEstado = this.filtroEstado === 'todos' || estado === this.filtroEstado;
      return matchSearch && matchRol && matchEstado;
    });
  }

  esUsuarioActual(u: UsuarioAdmin): boolean {
    return u.rol === 'administrador' && this.auth.currentUser?.id === u.id_usuario;
  }

  estadoDe(u: UsuarioAdmin): UserEstado {
    return u.activo ? 'activo' : 'suspendido';
  }

  talleresDe(u: UsuarioAdmin): number {
    return u.rol === 'docente' ? u.talleres_docente : u.talleres_alumno;
  }

  rolLabel(rol: UserRolAdmin): string {
    if (rol === 'docente') return 'Tutor';
    if (rol === 'administrador') return 'Admin';
    return 'Alumno';
  }

  // ---------- Nuevo docente ----------

  abrirNuevo(): void {
    this.nuevoForm = { nombres: '', email: '', password: '', telefono: '', institucion: '' };
    this.errorNuevo = '';
    this.showNuevo = true;
  }

  crearDocente(): void {
    this.errorNuevo = '';
    const f = this.nuevoForm;
    if (f.nombres.trim().length < 3) { this.errorNuevo = 'Ingresa el nombre completo.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { this.errorNuevo = 'Ingresa un correo válido.'; return; }
    if (f.password.length < 8) { this.errorNuevo = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (f.telefono.replace(/\D/g, '').length !== 9) { this.errorNuevo = 'El teléfono debe tener 9 dígitos.'; return; }
    if (f.institucion.trim().length < 3) { this.errorNuevo = 'Ingresa la institución.'; return; }

    this.creandoDocente = true;
    this.usuarioService.crearDocente({
      nombres: f.nombres.trim(), email: f.email.trim(), password: f.password,
      telefono: f.telefono.trim(), institucion: f.institucion.trim()
    }).subscribe({
      next: (nuevo) => {
        this.creandoDocente = false;
        this.showNuevo = false;
        this.usuarios.update(list => [nuevo, ...list]);
      },
      error: (err) => {
        this.creandoDocente = false;
        this.errorNuevo = err.error?.message || 'No se pudo crear el docente.';
      }
    });
  }

  // ---------- Ver/editar ----------

  openModal(u: UsuarioAdmin): void {
    this.modalUsuario = { ...u };
    this.editForm = { ...u };
    this.editMode = false;
    this.guardado = false;
  }

  closeModal(): void { this.modalUsuario = null; this.editMode = false; }
  enableEdit(): void { this.editMode = true; }

  setRol(rol: UserRolAdmin): void {
    if (this.editForm?.rol === 'administrador' && rol !== 'administrador') return;
    this.editForm.rol = rol;
  }

  esAdministrador(u: UsuarioAdmin | null): boolean {
    return u?.rol === 'administrador';
  }

  saveEdit(): void {
    this.guardando = true;
    this.usuarioService.actualizar(this.editForm.id_usuario, {
      nombres: this.editForm.nombres,
      email: this.editForm.email,
      telefono: this.editForm.telefono,
      rol: this.editForm.rol,
      institucion: this.editForm.rol === 'docente' ? (this.editForm.institucion ?? '') : undefined
    }).subscribe({
      next: (actualizado) => {
        this.guardando = false;
        this.usuarios.update(list => list.map(u => u.id_usuario === actualizado.id_usuario ? actualizado : u));
        this.modalUsuario = actualizado;
        this.editForm = { ...actualizado };
        this.guardado = true;
        setTimeout(() => { this.guardado = false; }, 2000);
      },
      error: (err) => {
        this.guardando = false;
        this.error = err.error?.message || 'No se pudo guardar.';
      }
    });
  }

  // ---------- Suspender/activar ----------

  pedirConfirm(u: UsuarioAdmin, accion: 'suspender' | 'activar'): void {
    if (u.rol === 'administrador' && accion === 'suspender') return;
    this.confirmTarget = u;
    this.confirmAccion = accion;
    this.showConfirm = true;
  }

  ejecutarConfirm(): void {
    if (!this.confirmTarget) return;
    const id = this.confirmTarget.id_usuario;
    const activo = this.confirmAccion === 'activar';

    this.usuarioService.cambiarEstado(id, activo).subscribe({
      next: () => this.aplicarEstado(id, activo),
      error: (err) => { this.error = err.error?.message || 'No se pudo cambiar el estado.'; }
    });
    this.confirmTarget = null;
    this.showConfirm = false;
  }

  private aplicarEstado(id: number, activo: boolean): void {
    this.usuarios.update(list => list.map(u => u.id_usuario === id ? { ...u, activo } : u));
    if (this.modalUsuario?.id_usuario === id) {
      this.modalUsuario = { ...this.modalUsuario, activo };
      this.editForm = { ...this.editForm, activo };
    }
  }

  // ---------- Exportar ----------

  exportarListado(formato: 'xlsx' | 'pdf'): void {
    this.exportando = true;
    this.usuarioService.exportar(formato, { rol: this.filtroRol !== 'todos' ? this.filtroRol : undefined, buscar: this.search || undefined })
      .subscribe({
        next: (blob) => {
          this.exportando = false;
          const fecha = new Date().toISOString().slice(0, 10);
          this.usuarioService.descargarBlob(blob, `usuarios_${fecha}.${formato}`);
        },
        error: () => { this.exportando = false; }
      });
  }

  exportarUno(formato: 'xlsx' | 'pdf'): void {
    if (!this.modalUsuario) return;
    this.exportando = true;
    this.usuarioService.exportar(formato, { id: this.modalUsuario.id_usuario }).subscribe({
      next: (blob) => {
        this.exportando = false;
        const nombreLimpio = this.modalUsuario!.nombres.replace(/\s+/g, '_').toLowerCase();
        this.usuarioService.descargarBlob(blob, `usuario_${nombreLimpio}.${formato}`);
      },
      error: () => { this.exportando = false; }
    });
  }

  // ---------- Helpers UI ----------

  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    const colores = ['#2d9e5f', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#ef4444', '#6366f1'];
    return colores[nombre.charCodeAt(0) % colores.length];
  }

  rolClass(rol: UserRolAdmin): string {
    if (rol === 'docente') return 'badge-tutor';
    if (rol === 'administrador') return 'bg-dark text-white';
    return 'badge-alumno';
  }

  estadoClass(estado: UserEstado): string {
    return estado === 'activo' ? 'text-success' : 'text-danger';
  }
  estadoDot(estado: UserEstado): string {
    return estado === 'activo' ? '#2d9e5f' : '#ef4444';
  }

  getMiembroDesde(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
