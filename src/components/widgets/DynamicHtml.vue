<script lang="ts">
import { defineComponent, h } from 'vue'

/**
 * Renders dynamic HTML tag with v-html content.
 * Works in SSR (unlike <component :is> + v-html which Vue SSR compiler breaks).
 */
export default defineComponent({
  props: {
    tag: { type: String, default: 'div' },
    html: { type: String, default: '' },
  },
  setup(props, { attrs }) {
    return () => h(props.tag, { ...attrs, innerHTML: props.html })
  },
})
</script>
