import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

//Icono por defecto de Leaflet en Angular
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-mapa-vista',
  imports: [],
  template: `<div #mapEl class="leaflet-map"></div>`,
  styleUrl: './mapa-vista.css',
})
export class MapaVista implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude = -12.0464;
  @Input() longitude = -77.0428;
  @Input() title = 'Ubicación';
  @Input() markers: { lat: number; lng: number; label: string }[] = [];

  private map?: L.Map;
  private markerLayer?: L.LayerGroup;

  constructor(private el: ElementRef, private ngZone: NgZone) { }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.initMap();
        });
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['latitude'] || changes['longitude'] || changes['markers']) {
      this.refreshMarkers();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const container = this.el.nativeElement.querySelector('.leaflet-map');
    if (!container) return;

    // Calcular altura si está en 0
    const rect = container.getBoundingClientRect();
    if (rect.height < 10) {
      container.style.height = '320px';
    }

    this.map = L.map(container, { zoomControl: true })
      .setView([this.latitude, this.longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.refreshMarkers();

    setTimeout(() => this.map?.invalidateSize(true), 100);
    setTimeout(() => this.map?.invalidateSize(true), 400);
  }

  private refreshMarkers(): void {
    if (!this.map) return;
    if (!this.markerLayer) {
      this.markerLayer = L.layerGroup().addTo(this.map);
    }
    this.markerLayer.clearLayers();

    if (this.markers.length > 0) {
      this.markers.forEach(m => {
        L.marker([m.lat, m.lng])
          .addTo(this.markerLayer!)
          .bindPopup(`<strong>${m.label}</strong>`);
      });
    }

    setTimeout(() => this.map?.invalidateSize(true), 50);
  }

  //Llamar desde el padre para mover el mapa 
  panTo(lat: number, lng: number): void {
    this.map?.setView([lat, lng], 14);
    setTimeout(() => this.map?.invalidateSize(true), 50);
  }
}