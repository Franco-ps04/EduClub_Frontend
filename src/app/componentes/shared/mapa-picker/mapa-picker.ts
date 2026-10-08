import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges,
  OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

export interface SugerenciaLugar {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Selector de ubicacion: buscador con autocompletado (Nominatim /
 * OpenStreetMap) + mapa Leaflet donde se puede hacer clic o arrastrar el
 * marcador para ajustar la posicion. Emite {lat, lng} cada vez que cambia.
 */
@Component({
  selector: 'app-mapa-picker',
  imports: [FormsModule],
  templateUrl: './mapa-picker.html',
  styleUrl: './mapa-picker.css',
})
export class MapaPicker implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitud: number | null = null;
  @Input() longitud: number | null = null;
  @Input() ubicacionTexto = '';
  @Output() ubicacionSeleccionada = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('mapaEl', { static: true }) mapaEl!: ElementRef<HTMLDivElement>;

  query = '';
  sugerencias: SugerenciaLugar[] = [];
  buscando = false;
  mostrarSugerencias = false;

  private mapa?: L.Map;
  private marcador?: L.Marker;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private readonly centroDefault: [number, number] = [-12.0464, -77.0428]; // Lima, Peru

  ngAfterViewInit(): void {
    const lat = this.latitud ?? this.centroDefault[0];
    const lng = this.longitud ?? this.centroDefault[1];

    this.mapa = L.map(this.mapaEl.nativeElement).setView([lat, lng], this.latitud ? 15 : 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapa);

    if (this.latitud && this.longitud) {
      this.colocarMarcador(this.latitud, this.longitud, false);
    }

    this.mapa.on('click', (e: L.LeafletMouseEvent) => {
      this.colocarMarcador(e.latlng.lat, e.latlng.lng, true);
    });

    // El mapa puede quedar con tamano 0 si el modal aun no estaba visible
    // al inicializarse; se recalcula tras el primer render.
    setTimeout(() => this.mapa?.invalidateSize(), 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapa) return;
    if ((changes['latitud'] || changes['longitud']) && this.latitud && this.longitud) {
      this.colocarMarcador(this.latitud, this.longitud, false);
      this.mapa.setView([this.latitud, this.longitud], 15);
    }
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onQueryChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    const texto = this.query.trim();
    if (texto.length < 3) {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
      return;
    }

    this.debounceTimer = setTimeout(() => this.buscarLugares(texto), 400);
  }

  private async buscarLugares(texto: string): Promise<void> {
    this.buscando = true;
    try {
      // Nominatim (OpenStreetMap): busqueda gratuita, se acota a Peru para
      // resultados mas relevantes y se limitan las llamadas con el debounce.
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&countrycodes=pe&q=${encodeURIComponent(texto)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data: any[] = await res.json();

      this.sugerencias = (data || []).map(item => ({
        displayName: item.display_name as string,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
      this.mostrarSugerencias = this.sugerencias.length > 0;
    } catch {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
    } finally {
      this.buscando = false;
    }
  }

  elegirSugerencia(s: SugerenciaLugar): void {
    this.query = s.displayName;
    this.mostrarSugerencias = false;
    this.colocarMarcador(s.lat, s.lng, true);
    this.mapa?.setView([s.lat, s.lng], 16);
  }

  private colocarMarcador(lat: number, lng: number, emitir: boolean): void {
    if (!this.mapa) return;

    if (this.marcador) {
      this.marcador.setLatLng([lat, lng]);
    } else {
      this.marcador = L.marker([lat, lng], { draggable: true }).addTo(this.mapa);
      this.marcador.on('dragend', () => {
        const pos = this.marcador!.getLatLng();
        this.ubicacionSeleccionada.emit({ lat: pos.lat, lng: pos.lng });
      });
    }

    if (emitir) {
      this.ubicacionSeleccionada.emit({ lat, lng });
    }
  }
}
