<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ src: String });
const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
</script>
<template><img v-if="src && !failed" class="center-logo" :src="src" alt="" referrerpolicy="no-referrer" @error="failed = true"><span v-else class="brand-icon" aria-hidden="true">S</span></template>
