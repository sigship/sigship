<template>
  <article v-html="post.content" />
</template>
<script setup>
defineProps(['post']);
</script>
