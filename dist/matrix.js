const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const hash = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const glyphs = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}:=+';

export function createMatrixTransition(isStill) {
  const element = document.querySelector('#matrix-transition');
  const canvas = element.querySelector('canvas');
  const label = element.querySelector('.matrix-label');
  const ctx = canvas.getContext('2d');
  let frame = 0, job = null, width = 0, height = 0, ratio = 1;
  let pointer = {x: 0, y: 0}, drift = {x: 0, y: 0};
  let palette = {}, fontFamily = '';

  function readTheme() {
    const style = getComputedStyle(document.documentElement);
    for (const key of ['bg', 'fg', 'green', 'dim']) palette[key] = style.getPropertyValue(`--${key}`).trim();
    fontFamily = getComputedStyle(document.body).fontFamily;
  }

  function resize() {
    width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }

  function clean() {
    cancelAnimationFrame(frame); frame = 0;
    element.hidden = true;
    document.body.classList.remove('matrix-running');
    label.style.opacity = '0';
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function cancel() {
    const previous = job; job = null;
    clean();
    previous?.resolve();
  }

  function covered() {
    if (!job || job.committed) return;
    job.committed = true;
    job.onCover();
  }

  function finish() {
    if (!job) return;
    covered();
    cancel();
  }

  function stream(x, head, size, count, seed, clock, alpha, reverse = false) {
    ctx.font = `${size}px ${fontFamily}`;
    const step = size * 1.28;
    for (let row = count - 1; row >= 0; row--) {
      const y = reverse ? height - head + row * step : head - row * step;
      if (y < -step || y > height + step) continue;
      const index = Math.floor(hash(seed * 71 + row * 13 + Math.floor(clock * (2 + hash(seed))) * 3) * glyphs.length);
      ctx.globalAlpha = alpha * (row === 0 ? 1 : Math.pow(1 - row / count, 1.65) * .72);
      ctx.fillStyle = row === 0 ? palette.fg : row < 3 ? palette.green : palette.dim;
      ctx.fillText(glyphs[index], x, y);
    }
  }

  function draw(progress, elapsed) {
    // Follow the same animated theme tokens as the page, including mid-wipe changes.
    readTheme();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const reverse = job.toIntro;
    const revealing = progress > .51;
    const cell = width < 681 ? 18 : 23;
    const count = Math.ceil(width / cell);
    const fade = 1 - clamp((progress - .85) / .15);
    const clock = elapsed / 1000;
    drift.x += (pointer.x - drift.x) * .12;
    drift.y += (pointer.y - drift.y) * .12;

    for (let col = 0; col < count; col++) {
      const delay = hash(col + 22) * .16;
      const wave = revealing ? (progress - .51) * 3.5 - delay : progress * 2.65 - delay;
      const front = wave * (height + 120);
      const edge = clamp(front, 0, height);
      const left = col * cell;
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.bg;
      if (!revealing) {
        ctx.fillRect(left, reverse ? height - edge : 0, cell + 1, edge);
      } else {
        ctx.fillRect(left, reverse ? 0 : edge, cell + 1, height - edge);
      }
      // The bright head follows the moving curtain; its tail gives the wipe depth.
      const size = 12 + Math.floor(hash(col + 9) * 3);
      stream(left + 4 + drift.x * 4, front + drift.y * 8, size, 12 + Math.floor(hash(col) * 15), col, clock * 7, fade, reverse);
    }

    // A slower layer reads as code at a distance, behind the main cascade.
    const atmosphere = Math.sin(Math.PI * progress) * .68;
    for (let col = 0; col < Math.ceil(width / 30); col++) {
      const seed = col + 310;
      const y = ((hash(seed) * height + elapsed * (.35 + hash(seed + 3) * .25)) % (height + 300)) - 100;
      stream(col * 30 + drift.x * 13, y, 11, 20, seed, clock * 5, atmosphere);
    }
    ctx.globalAlpha = 1;
    label.style.opacity = String(clamp((progress - .24) / .16) * (1 - clamp((progress - .56) / .17)));
    label.style.transform = `translate3d(${drift.x * -13}px,${drift.y * -8}px,0)`;
  }

  function tick(now) {
    if (!job) return;
    const elapsed = now - job.started;
    const progress = clamp(elapsed / job.duration);
    if (progress >= .48) covered();
    if (!job) return;
    if (now - job.painted >= 1000 / 30 || progress === 1) {
      draw(progress, elapsed); job.painted = now;
    }
    if (progress === 1) { cancel(); return; }
    frame = requestAnimationFrame(tick);
  }

  function run({toIntro, onCover}) {
    cancel();
    if (isStill() || document.hidden || !ctx) { onCover(); return Promise.resolve(); }
    resize();
    element.hidden = false;
    document.body.classList.add('matrix-running');
    label.querySelector('strong').textContent = toIntro ? 'BACK TO THE SOURCE.' : 'HELLO, WORLD.';
    label.querySelector('span').textContent = toIntro ? '~/andre / home' : '~/andre / explore';
    return new Promise(resolve => {
      job = {toIntro, onCover, resolve, committed: false, started: performance.now(), painted: 0, duration: width < 681 ? 1250 : 1550};
      draw(0, 0);
      frame = requestAnimationFrame(tick);
    });
  }

  addEventListener('resize', () => { if (job) resize(); });
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointer = {x: clamp(event.clientX / innerWidth * 2 - 1, -1, 1), y: clamp(event.clientY / innerHeight * 2 - 1, -1, 1)};
  }, {passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  return {run, cancel, finish};
}
