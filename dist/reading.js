// Off-screen records reveal once when read. Content is never hidden while waiting.
export function createReading(isStill) {
  const content = document.querySelector('#content');
  const scroller = document.querySelector('.terminal-scroll');
  const compact = matchMedia('(max-width: 680px)');
  const line = document.querySelector('.reading-progress i');
  const label = document.querySelector('#read-position');
  const seen = new WeakSet(), animations = new Set();
  let observer, frame = 0, enabled = false;

  function update() {
    frame = 0;
    if (!enabled) return;
    let distance, total;
    if (compact.matches) {
      const bounds = content.getBoundingClientRect();
      distance = 110 - bounds.top;
      total = bounds.height - Math.max(1, innerHeight - 160);
    } else {
      distance = scroller.scrollTop;
      total = scroller.scrollHeight - scroller.clientHeight;
    }
    const progress = total <= 1 ? 1 : Math.max(0, Math.min(1, distance / total));
    line.style.transform = `scaleX(${progress})`;
    label.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;
  }

  function request() { if (enabled && !frame) frame = requestAnimationFrame(update); }

  function finish() {
    for (const animation of animations) animation.finish();
  }

  function suspend() {
    enabled = false;
    observer?.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
    finish();
  }

  function refresh() {
    observer?.disconnect();
    enabled = !document.querySelector('#portfolio').hidden;
    if (!enabled) return;
    request();
    if (isStill()) return;
    const root = compact.matches ? null : scroller;
    const boundary = root ? root.getBoundingClientRect() : {top: 0, bottom: innerHeight};
    observer = new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (!isIntersecting) continue;
        observer.unobserve(target);
        if (seen.has(target) || !target.isConnected) continue;
        seen.add(target);
        if (isStill()) continue;
        const animation = target.animate([
          {opacity: .25, transform: 'translateY(14px)'},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 520, easing: 'cubic-bezier(.22,1,.36,1)'});
        animations.add(animation);
        animation.finished.catch(() => {}).finally(() => { animations.delete(animation); animation.cancel(); });
      }
    }, {root, threshold: 0, rootMargin: '0px 0px -24px 0px'});
    content.querySelectorAll('.record,.stack-row,.code-diagram').forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < boundary.bottom && bounds.bottom > boundary.top) seen.add(element);
      else if (!seen.has(element)) observer.observe(element);
    });
  }

  scroller.addEventListener('scroll', request, {passive: true});
  addEventListener('scroll', request, {passive: true});
  addEventListener('resize', request);
  compact.addEventListener('change', refresh);
  const resize = new ResizeObserver(request);
  resize.observe(content);
  resize.observe(scroller);
  return {refresh, suspend, finish};
}
