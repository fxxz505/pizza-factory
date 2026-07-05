<script setup>
// 通用原料像素图标：包一层 canvas ref，调用 drawIngSprite。
import { ref, onMounted, watch } from 'vue'
import { drawIngSprite } from '../composables/utils/pixelArt.js'

const props = defineProps({
  ingKey: { type: String, required: true },
  size: { type: Number, default: 28 },
})

const canvasRef = ref(null)

function render() {
  if (!canvasRef.value) return
  drawIngSprite(canvasRef.value.getContext('2d'), props.ingKey, 16)
}

onMounted(render)
watch(() => props.ingKey, render)
</script>

<template>
  <canvas
    ref="canvasRef"
    width="16"
    height="16"
    :style="{ width: size + 'px', height: size + 'px' }"
  ></canvas>
</template>
