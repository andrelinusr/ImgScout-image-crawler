(() => {
  const urlsJpg = new Set();

  // 1. Procura em todas as tags <img>
  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || img.getAttribute('lazy-src');
    if (src && (src.toLowerCase().includes('.jpg') || src.toLowerCase().includes('.jpeg'))) {
      urlsJpg.add(src);
    }
  });

  // 2. Procura em imagens de fundo (CSS)
  document.querySelectorAll('*').forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\((['"]?)(.*?)\1\)/);
      if (match && match[2]) {
        const url = match[2];
        if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) {
          urlsJpg.add(url);
        }
      }
    }
  });

  // 3. Executa o download automático
  if (urlsJpg.size === 0) {
    alert("Nenhuma imagem JPG encontrada nesta página.");
  } else {
    Array.from(urlsJpg).forEach((url, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop().split('?')[0] || `imagem_${index}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 400); // Evita bloqueio do navegador
    });
  }
})();
