/**
 * LessCMS Vue Router
 *
 * Provides routing utilities for LessCMS-powered applications.
 */

import { createRouter, createWebHistory, type RouteRecordRaw, type Router, type RouterOptions } from 'vue-router'
import PageRenderer from '@/components/PageRenderer.vue'
import CollectionListView from '@/components/CollectionListView.vue'
import CollectionEntryView from '@/components/CollectionEntryView.vue'
import DynamicPageResolver from '@/components/DynamicPageResolver.vue'

/**
 * Default LessCMS routes
 */
export const defaultRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: PageRenderer,
    props: { code: 'home' },
  },
  {
    path: '/page/:code',
    name: 'page',
    component: PageRenderer,
    props: true,
  },
  {
    path: '/collection/:collectionCode',
    name: 'collection-list',
    component: CollectionListView,
    props: true,
  },
  {
    path: '/collection/:collectionCode/:entryId',
    name: 'collection-entry',
    component: CollectionEntryView,
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'dynamic',
    component: DynamicPageResolver,
  },
]

/**
 * Options for creating the LessCMS router
 */
export interface LessCMSRouterOptions {
  base?: string
  homePageCode?: string
  additionalRoutes?: RouteRecordRaw[]
  prependRoutes?: RouteRecordRaw[]
  routerOptions?: Partial<RouterOptions>
}

/**
 * Create a LessCMS router with default routes
 */
export function createLessCMSRouter(options: LessCMSRouterOptions = {}): Router {
  const {
    base = '/',
    homePageCode = 'home',
    additionalRoutes = [],
    prependRoutes = [],
    routerOptions = {},
  } = options

  // Modify home route if custom page code provided
  const routes = defaultRoutes.map((route) => {
    if (route.name === 'home' && homePageCode !== 'home') {
      return {
        ...route,
        props: { code: homePageCode },
      }
    }
    return route
  })

  // Combine routes: prepend -> default -> additional
  const allRoutes = [...prependRoutes, ...routes, ...additionalRoutes]

  return createRouter({
    history: createWebHistory(base),
    routes: allRoutes,
    ...routerOptions,
  })
}

/**
 * Get routes for use with custom router setup
 */
export function getLessCMSRoutes(options: { homePageCode?: string } = {}): RouteRecordRaw[] {
  const { homePageCode = 'home' } = options

  return defaultRoutes.map((route) => {
    if (route.name === 'home' && homePageCode !== 'home') {
      return {
        ...route,
        props: { code: homePageCode },
      }
    }
    return route
  })
}

export { PageRenderer, CollectionListView, CollectionEntryView, DynamicPageResolver }
