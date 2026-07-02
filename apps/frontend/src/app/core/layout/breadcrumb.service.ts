import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Builds breadcrumbs from each activated route segment's `data.breadcrumb`, walking the full
 * route tree rather than reading just the leaf route. Current routes are flat (one segment per
 * feature), but this walks recursively so nested routes (e.g. a future `tasks/:id`) pick up
 * breadcrumbs automatically without changes here.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly breadcrumbsSignal = signal<Breadcrumb[]>([]);
  readonly breadcrumbs = this.breadcrumbsSignal.asReadonly();

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.breadcrumbsSignal.set(this.buildBreadcrumbs(this.activatedRoute.root));
      });
  }

  private buildBreadcrumbs(route: ActivatedRoute, url = '', acc: Breadcrumb[] = []): Breadcrumb[] {
    let breadcrumbs = acc;

    for (const child of route.children) {
      const segment = child.snapshot.url.map((s) => s.path).join('/');
      const nextUrl = segment ? `${url}/${segment}` : url;
      const label = child.snapshot.data['breadcrumb'] as string | undefined;

      if (label) {
        breadcrumbs = [...breadcrumbs, { label, url: nextUrl }];
      }

      breadcrumbs = this.buildBreadcrumbs(child, nextUrl, breadcrumbs);
    }

    return breadcrumbs;
  }
}
