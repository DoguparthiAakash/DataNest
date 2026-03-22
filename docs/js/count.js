// Animated counter
function animateCount(el, target, duration = 1000) {
  let start = 0;
  const increment = target / (duration / 16);
  function update() {
    start += increment;
    if (start < target) {
      el.textContent = Math.floor(start);
      requestAnimationFrame(update);
    } else {
      el.textContent = target;
    }
  }
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  const cnt = document.getElementById('statsCount');
  if (cnt) {
    fetch('./datas/index.json').then(r => r.json()).then(f => {
      animateCount(cnt, f.length);
    }).catch(() => animateCount(cnt, 11));
  }
});
