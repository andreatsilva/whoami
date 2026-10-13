const clamp = value => Math.max(0, Math.min(1, value));

export function createWheel(element, isStill) {
  const cards = [...element.querySelectorAll('.section-card')];
  const compact = matchMedia('(max-width: 680px)');
  let position = 0, target = 0, selected = 0, from = 0, started = 0, duration = 0, frame = 0;

  function paint() {
    const count = cards.length;
    cards.forEach((card, index) => {
      // Recycle at the masked edges, never by flying a card through the selected item.
      const offset = ((index - position + count / 2) % count + count) % count - count / 2;
      const edge = clamp((count / 2 - Math.abs(offset)) * 1.7);
      card.style.transform = `translate(${offset * offset * 4}px,${offset * 102 - 45}px) rotate(${-offset * 6}deg)`;
      card.style.opacity = String(Math.max(.13, 1 - Math.abs(offset) * .23) * edge);
      card.style.zIndex = String(5 - Math.floor(Math.abs(offset)));
    });
  }

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    position = target;
    paint();
  }

  function tick(now) {
    const progress = clamp((now - started) / duration);
    position = from + (target - from) * (1 - (1 - progress) ** 4);
    paint();
    frame = progress < 1 ? requestAnimationFrame(tick) : 0;
  }

  function select(index, immediate = false) {
    let step = index - selected;
    if (step > cards.length / 2) step -= cards.length;
    if (step < -cards.length / 2) step += cards.length;
    selected = index;
    target += step;
    cards.forEach((card, i) => {
      card.classList.toggle('selected', i === index);
      card.setAttribute('aria-current', i === index ? 'page' : 'false');
    });
    if (immediate || isStill() || compact.matches || document.hidden) { settle(); return; }
    from = position;
    started = performance.now();
    duration = Math.min(800, 470 + Math.abs(target - from) * 65);
    if (!frame) frame = requestAnimationFrame(tick);
  }

  compact.addEventListener('change', settle);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  paint();
  return {select, settle};
}
