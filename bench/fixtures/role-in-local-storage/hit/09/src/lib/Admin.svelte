<script>
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
</script>
{#if isAdmin}<slot />{/if}
