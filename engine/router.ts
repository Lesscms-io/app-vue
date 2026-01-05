/**
 * LessCMS Universal Router
 *
 * Uses DynamicPageResolver to handle all routes from LessCMS API.
 */

import { createRouter as createVueRouter, createWebHistory } from 'vue-router'
import { DynamicPageResolver } from '../src'

export function createRouter() {
  return createVueRouter({
    history: createWebHistory(),
    routes: [
      // Catch-all route - DynamicPageResolver handles everything
      {
        path: '/:pathMatch(.*)*',
        name: 'dynamic',
        component: DynamicPageResolver,
        props: (route) => ({
          language: route.query.lang || import.meta.env.VITE_LESSCMS_LANGUAGE || 'pl'
        })
      },
    ],
  })
}
