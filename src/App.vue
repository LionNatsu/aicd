<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <div class="logo">
      <h1>AICD</h1>
      <p>Automated Industry Complex Designer</p>
    </div>
  </header>

  <main>
    <HelloWorld msg="明日方舟 · 终末地 — 集成工业系统配平工具" />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
}

.logo h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0;
}

.logo p {
  font-size: 0.9rem;
  opacity: 0.7;
  margin: 0.5rem 0 0;
}

main {
  display: flex;
  justify-content: center;
}
</style>
