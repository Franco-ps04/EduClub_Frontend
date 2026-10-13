import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuAlumno } from '../menu/menu';
import { FooterAlumno } from '../footer/footer';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, MenuAlumno, FooterAlumno],
  template: `<app-menu-alumno></app-menu-alumno><main class="pt-4 mt-4"><router-outlet /></main><app-footer-alumno></app-footer-alumno>`,
  styles: [`.et-public-main{min-height:calc(100vh - 210px);padding-top:64px;background:#f8fafc}`]
})
export class PublicLayoutAlumno { }
