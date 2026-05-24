<script setup lang="ts">
defineProps<{
  msg: string
}>()
</script>

<template>
  <div class="greetings">
    <h1>{{ msg }}</h1>
    <p>产线配平 · 效率调试 · 方案分享</p>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 1.8rem;
}

.greetings {
  text-align: center;
  padding: 2rem;
}

.greetings p {
  opacity: 0.6;
  margin-top: 0.5rem;
}
</style>
