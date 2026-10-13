import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlumnoService, DestinatarioMensaje, InscripcionAlumno, MensajeAlumno } from '../../../services/alumno.service';
import { AuthService } from '../../../services/auth.service';
import { MensajeService } from '../../../services/mensaje.service';

@Component({ selector: 'app-mensajes-alumno', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './mensajes.html', styleUrl: './mensajes.css' })
export class MensajesAlumno implements OnInit {
  mensajes: MensajeAlumno[] = []; destinatarios: DestinatarioMensaje[] = []; inscripciones: InscripcionAlumno[] = [];
  seleccionado: MensajeAlumno | null = null; loading = true; error = ''; searchText = ''; filtro: 'todos' | 'sin-leer' | 'respondidos' = 'todos';
  showModal = false; sendingNew = false; errorNuevo = ''; nuevoAsunto = ''; nuevoMensaje = ''; destinatarioId: number | null = null; tallerId: number | null = null; destinoTipo: 'administrador' | 'taller' = 'administrador';
  errorDestinatario = ''; errorTaller = ''; errorAsunto = ''; errorMensaje = '';
  seguimientoTexto = ''; sendingFollowup = false; errorSeguimiento = '';
  constructor(public auth: AuthService, private alumno: AlumnoService, private mensajeService: MensajeService) { }
  ngOnInit(): void {
    this.alumno.destinatarios().subscribe({ next: d => { this.destinatarios = d ?? []; if (this.destinoTipo === 'administrador' || !this.showModal) this.destinatarioId = this.administradores[0]?.id_usuario ?? null; else this.onWorkshopChange(); }, error: () => this.destinatarios = [] });
    this.alumno.misInscripciones().subscribe({ next: d => { this.inscripciones = (d ?? []).filter(i => !['cancelado', 'anulado', 'finalizado'].includes(this.key(i.estado_inscripcion)) && !['finalizado', 'cancelado'].includes(this.key(i.estado_taller))); if (this.showModal && this.destinoTipo === 'taller' && !this.tallerId) { this.tallerId = this.inscripciones[0]?.id_taller ?? null; this.onWorkshopChange(); } }, error: () => this.inscripciones = [] });
    this.load();
  }
  private key(v: string | null | undefined): string { return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  load(selectId?: number): void { this.loading = true; this.alumno.mensajes().subscribe({ next: data => { this.mensajes = data ?? []; this.loading = false; const wanted = selectId ? this.mensajes.find(m => m.id_mensaje === selectId) : null; const still = this.seleccionado ? this.mensajes.find(m => m.id_mensaje === this.seleccionado!.id_mensaje) : null; const next = wanted ?? still ?? this.mensajes[0] ?? null; if (next) this.select(next, true); else this.seleccionado = null; }, error: err => { this.loading = false; this.error = err?.error?.message ?? 'No se pudieron cargar tus mensajes.'; } }); }
  filtered(): MensajeAlumno[] { const q = this.searchText.trim().toLowerCase(); return this.mensajes.filter(m => { const unread = (m.historial ?? []).length > 0 && !m.leido_por_alumno; const filterOk = this.filtro === 'todos' || (this.filtro === 'sin-leer' ? unread : m.respondido); const searchOk = !q || m.asunto.toLowerCase().includes(q) || m.mensaje.toLowerCase().includes(q) || String(m.destinatario ?? '').toLowerCase().includes(q); return filterOk && searchOk; }); }
  select(m: MensajeAlumno, mark = true): void { this.seguimientoTexto = ''; this.errorSeguimiento = ''; this.seleccionado = m; if (mark && !m.leido_por_alumno) { this.mensajeService.marcarLeidoAlumno(m.id_mensaje).subscribe({ next: () => { m.leido_por_alumno = true; this.mensajes = this.mensajes.map(x => x.id_mensaje === m.id_mensaje ? { ...x, leido_por_alumno: true } : x); this.seleccionado = { ...m, leido_por_alumno: true }; this.mensajeService.refresh(); }, error: () => void 0 }); } else { this.mensajeService.refresh(); } }
  get unreadCount(): number { return this.mensajes.filter(m => (m.historial ?? []).length > 0 && !m.leido_por_alumno).length; }
  messageStatus(m: MensajeAlumno): { label: string; cls: string } { if ((m.historial ?? []).length > 0 && !m.leido_por_alumno) return { label: 'Nueva respuesta', cls: 'bg-success text-white' }; if (m.respondido) return { label: 'Respondido', cls: 'bg-secondary-subtle text-secondary' }; return { label: 'Pendiente', cls: 'bg-warning-subtle text-warning-emphasis' }; }
  isPending(m: MensajeAlumno): boolean { return !m.respondido && (m.historial ?? []).every(h => h.tipo !== 'admin'); }
  date(value: string): string { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d).replace('.', ''); }
  avatar(name: string | undefined): string { return (name ?? 'U').trim().charAt(0).toUpperCase() || 'U'; }
  get administradores(): DestinatarioMensaje[] { return this.destinatarios.filter(d => d.rol === 'administrador'); }
  get administradorSeleccionado(): DestinatarioMensaje | null {
    return this.administradores.find(d => d.id_usuario === Number(this.destinatarioId)) ?? null;
  }
  /** Persona que creó el taller seleccionado: puede ser un docente o el administrador. */
  get creadorTallerSeleccionado(): DestinatarioMensaje | null {
    if (this.destinoTipo !== 'taller' || !this.destinatarioId) return null;
    return this.destinatarios.find(d => Number(d.id_usuario) === Number(this.destinatarioId)
      && (d.rol === 'docente' || d.rol === 'administrador')) ?? null;
  }
  get tallerSeleccionado(): InscripcionAlumno | null {
    return this.inscripciones.find(i => Number(i.id_taller) === Number(this.tallerId)) ?? null;
  }
  cambiarDestino(tipo: 'administrador' | 'taller'): void {
    this.destinoTipo = tipo;
    this.errorNuevo = '';
    this.errorDestinatario = '';
    this.errorTaller = '';
    if (tipo === 'administrador') {
      this.tallerId = null;
      this.destinatarioId = this.administradores[0]?.id_usuario ?? null;
    } else {
      this.tallerId = this.inscripciones[0]?.id_taller ?? null;
      this.destinatarioId = null;
      this.onWorkshopChange();
    }
  }

  onWorkshopChange(): void {
    this.destinatarioId = null;
    this.errorTaller = '';
    this.errorNuevo = '';
    if (!this.tallerId) return;

    const ins = this.inscripciones.find(i => Number(i.id_taller) === Number(this.tallerId));
    if (!ins) return;

    // id_usuario_docente es el usuario vinculado a Taller.id_docente. Si el
    // Administrador creó el taller, el perfil técnico Docente apunta a su
    // propio usuario y rol, por lo que debe recibir la consulta directamente.
    const idCreador = Number(ins.id_usuario_docente);
    let creador = Number.isFinite(idCreador) && idCreador > 0
      ? this.destinatarios.find(d => Number(d.id_usuario) === idCreador
        && (d.rol === 'docente' || d.rol === 'administrador'))
      : undefined;

    // Compatibilidad para respuestas antiguas que no incluyan el ID del creador.
    if (!creador && ins.docente) {
      const rolCreador = ins.rol_docente === 'administrador' ? 'administrador' : 'docente';
      creador = this.destinatarios.find(d => d.rol === rolCreador
        && this.key(d.nombres) === this.key(ins.docente));
    }

    if (creador) {
      this.destinatarioId = creador.id_usuario;
    } else {
      this.errorTaller = 'No encontramos una cuenta activa de quien creó este taller. Para una consulta general, selecciona Administrador.';
    }
  }

  limpiarErrorCampo(campo: 'destinatario' | 'taller' | 'asunto' | 'mensaje'): void {
    if (campo === 'destinatario') this.errorDestinatario = '';
    if (campo === 'taller') this.errorTaller = '';
    if (campo === 'asunto') this.errorAsunto = '';
    if (campo === 'mensaje') this.errorMensaje = '';
    this.errorNuevo = '';
  }

  openNew(): void {
    this.showModal = true;
    this.errorNuevo = '';
    this.errorDestinatario = '';
    this.errorTaller = '';
    this.errorAsunto = '';
    this.errorMensaje = '';
    this.nuevoAsunto = '';
    this.nuevoMensaje = '';
    this.destinoTipo = 'administrador';
    this.tallerId = null;
    this.destinatarioId = this.administradores[0]?.id_usuario ?? null;
  }

  closeNew(): void { if (!this.sendingNew) this.showModal = false; }

  private validarNuevaConsulta(): boolean {
    this.errorDestinatario = '';
    this.errorTaller = '';
    this.errorAsunto = '';
    this.errorMensaje = '';

    if (this.destinoTipo === 'administrador') {
      if (!this.administradores.length) {
        this.errorDestinatario = 'No hay un administrador disponible para recibir la consulta.';
      } else if (!this.destinatarioId || !this.administradorSeleccionado) {
        this.errorDestinatario = 'Selecciona un administrador.';
      }
    } else {
      if (!this.inscripciones.length) {
        this.errorTaller = 'No tienes talleres activos para relacionar esta consulta.';
      } else if (!this.tallerId || !this.tallerSeleccionado) {
        this.errorTaller = 'Selecciona uno de tus talleres activos.';
      } else if (!this.destinatarioId || !this.creadorTallerSeleccionado) {
        this.errorTaller = 'No se encontró una cuenta activa de quien creó el taller. Selecciona Administrador para una consulta general.';
      }
    }

    if (!this.nuevoAsunto.trim()) this.errorAsunto = 'El asunto es obligatorio.';
    else if (this.nuevoAsunto.trim().length > 150) this.errorAsunto = 'El asunto no debe superar 150 caracteres.';

    if (!this.nuevoMensaje.trim()) this.errorMensaje = 'El mensaje es obligatorio.';
    else if (this.nuevoMensaje.trim().length > 5000) this.errorMensaje = 'El mensaje no debe superar 5000 caracteres.';

    return !this.errorDestinatario && !this.errorTaller && !this.errorAsunto && !this.errorMensaje;
  }

  private mostrarErrorServidor(err: any): void {
    const mensaje = String(err?.error?.message ?? 'No se pudo enviar la consulta.');
    const normalizado = this.key(mensaje);
    if (normalizado.includes('asunto')) this.errorAsunto = mensaje;
    else if (normalizado.includes('mensaje') || normalizado.includes('texto')) this.errorMensaje = mensaje;
    else if (this.destinoTipo === 'administrador' && normalizado.includes('destinatario')) this.errorDestinatario = mensaje;
    else if (normalizado.includes('taller') || normalizado.includes('destinatario') || normalizado.includes('docente') || normalizado.includes('administrador')) this.errorTaller = mensaje;
    else this.errorNuevo = mensaje;
  }

  sendNew(): void {
    this.errorNuevo = '';
    if (!this.validarNuevaConsulta()) return;
    this.sendingNew = true;
    this.alumno.enviarMensaje({
      idUsuarioDestino: Number(this.destinatarioId),
      asunto: this.nuevoAsunto.trim(),
      mensaje: this.nuevoMensaje.trim(),
      idTaller: this.destinoTipo === 'taller' ? (this.tallerId || null) : null
    }).subscribe({
      next: r => { this.sendingNew = false; this.showModal = false; this.load(r.id); },
      error: err => { this.sendingNew = false; this.mostrarErrorServidor(err); }
    });
  }
  sendFollowup(): void { if (!this.seleccionado || !this.seguimientoTexto.trim() || this.sendingFollowup) return; const text = this.seguimientoTexto.trim(); this.sendingFollowup = true; this.errorSeguimiento = ''; this.alumno.seguimiento(this.seleccionado.id_mensaje, text).subscribe({ next: () => { this.sendingFollowup = false; this.seguimientoTexto = ''; this.load(this.seleccionado?.id_mensaje); }, error: err => { this.sendingFollowup = false; this.errorSeguimiento = err?.error?.message ?? 'No se pudo enviar el seguimiento.'; } }); }
}
