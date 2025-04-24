import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'cheque-management/:id',
    renderMode: RenderMode.Server // Change to Server instead of Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
