chrome.runtime.onInstalled.addListener(() => {

  const canvas = new OffscreenCanvas(16, 16);

  const context = canvas.getContext('2d');

  context.font = '14px sans-serif';

  context.fillText('💾', 0, 14);

  const imageData = context.getImageData(0, 0, 16, 16);
 // ImgScout background service worker
});