/**
 * Server-render every widget that the renderer mounts on a page.
 *
 * A `const` used by an `immediate: true` watcher but declared further down the
 * setup body throws "cannot access before initialization" — on the server that
 * is not a warning, it is a 500 on every page carrying the widget. It cost the
 * dglab shop all of its product pages once; this catches it before a deploy.
 *
 *   node scripts/ssr-smoke.mjs
 */
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const WIDGETS = [
  ['LcmsProductConfigurator', { config: { display_mode: 'wizard' } }],
  ['LcmsProductConfigurator', { config: { display_mode: 'flat' } }],
  ['LcmsCart', {}],
  ['LcmsProductGrid', {}],
  ['LcmsCategoryGrid', {}],
]

let failed = 0

for (const [name, data] of WIDGETS) {
  const mod = await import(`../src/components/widgets/ecommerce/${name}.vue`)
  const app = createSSRApp({ render: () => h(mod.default, { data, language: 'pl' }) })

  // The widgets warn about missing injections outside a provider; that is not
  // what we are testing here and it drowns the real failure.
  const warn = console.warn
  console.warn = () => {}

  try {
    await renderToString(app)
    console.log(`ok   ${name} ${JSON.stringify(data)}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${name} ${JSON.stringify(data)}: ${error.message}`)
  } finally {
    console.warn = warn
  }
}

process.exit(failed ? 1 : 0)
