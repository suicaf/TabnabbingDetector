
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'compareImages') {
    const { imageUrl1, imageUrl2, tabId } = message;

    console.log('Offscreen worker comparing images');
    compareInGrid(imageUrl1, imageUrl2, tabId);
  }
});

async function compareInGrid(imgUrl1, imgUrl2, tabId) {
  const changedBoxes = [];
  const comparisonPromises = [];
  const grid_size = 10;

  const [img1, img2] = await Promise.all([
    loadImage(imgUrl1),
    loadImage(imgUrl2)
  ]);

  const boxWidth = img1.width / grid_size;
  const boxHeight = img1.height / grid_size;

  const canvas1 = createCanvas(img1.width, img1.height);
  const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
  ctx1.drawImage(img1, 0, 0);

  const canvas2 = createCanvas(img2.width, img2.height);
  const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });
  ctx2.drawImage(img2, 0, 0);

  for (let x = 0; x < grid_size; x++) {
    for (let y = 0; y < grid_size; y++) {
      const sx = x * boxWidth;
      const sy = y * boxHeight;
      const crop1 = ctx1.getImageData(sx, sy, boxWidth, boxHeight);
      const crop2 = ctx2.getImageData(sx, sy, boxWidth, boxHeight);

      const promise = new Promise((resolve) => {
        resemble(crop1)
          .compareTo(crop2)
          .onComplete((data) => {
            if (data.misMatchPercentage > 5) {
              changedBoxes.push({ x: x, y: y });
            }
            resolve();
          });
      });
      comparisonPromises.push(promise);
    }
  }

  // wait for all comparisons
  await Promise.all(comparisonPromises);

  chrome.runtime.sendMessage({
    type: 'compareResult',
    changedBoxes: changedBoxes,
    tabId: tabId
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}