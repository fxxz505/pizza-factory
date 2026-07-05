<script setup>
import { confirmState, confirmOk, confirmCancel } from '../composables/useToast.js'
</script>

<template>
  <div v-if="confirmState.open" class="modal-bg" @click.self="confirmCancel">
    <div class="modal" role="dialog" :aria-label="confirmState.title">
      <h3>{{ confirmState.title }}</h3>
      <p>{{ confirmState.body }}</p>
      <div class="row-2">
        <button class="btn ghost" @click="confirmCancel">取消</button>
        <button class="btn" @click="confirmOk">{{ confirmState.okLabel }}</button>
      </div>
    </div>
  </div>
</template>
