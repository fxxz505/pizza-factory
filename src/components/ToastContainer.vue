<script setup>
import { toasts, handleToastClick } from '../composables/useToast.js'
</script>

<template>
  <div class="toast-wrap" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="{ actionable: t.actionable, fading: t.fading }"
      @click="t.actionable ? handleToastClick(t) : null"
    >
      <b>{{ t.title }}</b>
      <span v-html="t.body"></span>
    </div>
  </div>
</template>
