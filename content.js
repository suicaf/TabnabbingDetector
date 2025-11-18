

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_WARNING') {
    drawOverlays(message.changedBoxes);
  }
});

function drawOverlays(changedBoxes) {
  // Clear old overlays
  const oldOverlays = document.querySelectorAll('.tabnab-overlay-box');
  oldOverlays.forEach(box => box.remove());

  const width = window.innerWidth;
  const height = window.innerHeight;
  const boxWidth = width / 10;
  const boxHeight = height / 10;

  for (const box of changedBoxes) {
    const div = document.createElement('div');
    div.className = 'tabnab-overlay-box';
    div.style.position = 'fixed';
    div.style.left = `${box.x * boxWidth}px`;
    div.style.top = `${box.y * boxHeight}px`;
    div.style.width = `${boxWidth}px`;
    div.style.height = `${boxHeight}px`;
    
    div.style.pointerEvents = 'none'; 
    div.style.zIndex = '2147483647'; // Max z-index to show on top
    
    document.body.appendChild(div);
  }
}