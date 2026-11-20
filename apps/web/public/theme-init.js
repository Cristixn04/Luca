try {
  const storedScheme = localStorage.getItem('color-scheme');
  if (storedScheme === 'light' || storedScheme === 'dark') {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.content = storedScheme;
    }
  }
} catch {
  // Ignorar si el almacenamiento local está restringido.
}
