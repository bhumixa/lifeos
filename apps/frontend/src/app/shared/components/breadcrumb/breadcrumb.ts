import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  private readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly breadcrumbs = this.breadcrumbService.breadcrumbs;
}
