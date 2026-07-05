<script setup>
// 通用披萨渲染画布：包一层 canvas ref，调用 drawPizza。
import { ref, onMounted, watch } from 'vue'
import { drawPizza } from '../composables/utils/pixelArt.js'

const props = defineProps({
  ingKeys: { type: Array, required: true },
  size: { type: Number, default: 48 },
  className: { type: String, default: '' },
})

const canvasRef = ref(null)

function render() {
  if (!canvasRef.value) return
  drawPizza(canvasRef.value.getContext('2d'), props.ingKeys, props.size)
}

onMounted(render)
watch(() => [props.ingKeys, props.size], render, { deep: true })

defineExpose({ render })
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="size"
    :height="size"
    :class="className"
    :style="{ width: size + 'px', height: size + 'px' }"
  ></canvas>
</template>
