// Choreography is separate from routing so interrupted navigation cannot commit stale content.
import {createMatrixTransition} from './matrix.js';
const ease = 'cubic-bezier(.22,1,.36,1)';
const $ = selector => document.querySelector(selector);

export function createTransitions(isStill) {
  const groups = new Map();
  const matrix = createMatrixTransition(isStill);
  let routeId = 0, dialogId = 0, menuId = 0;

  function cancel(group) {
    for (const animation of groups.get(group) || []) animation.cancel();
    groups.delete(group);
  }

  function play(element, frames, options = {}, group = 'route') {
    if (!element || isStill() || !element.checkVisibility()) return Promise.resolve();
    const animation = element.animate(frames, {duration: 480, easing: ease, fill: 'both', ...options});
    if (!groups.has(group)) groups.set(group, new Set());
    groups.get(group).add(animation);
    return animation.finished.catch(() => {}).finally(() => {
      groups.get(group)?.delete(animation);
      animation.cancel();
    });
  }

  function rise(element, delay = 0, distance = 14, duration = 520) {
    return play(element, [
      {opacity: 0, transform: `translateY(${distance}px)`},
      {opacity: 1, transform: 'translateY(0)'}
    ], {delay, duration});
  }

  function introIn() {
    return Promise.all([
      play($('.intro-art'), [{opacity: 0, transform: 'scale(.96)'}, {opacity: 1, transform: 'scale(1)'}], {duration: 880}),
      ...[...$('.intro-copy').children].map((element, i) => rise(element, 70 + i * 55, 16, 620)),
      rise($('.intro-topline'), 0, 0, 600),
      rise($('.intro-bottom'), 220, 0, 600)
    ]);
  }

  function workspaceIn(depth = false) {
    return Promise.all([
      play($('.workspace-top'), [{opacity: 0, clipPath: 'inset(0 100% 0 0)'}, {opacity: 1, clipPath: 'inset(0 0% 0 0)'}], {duration: 620}),
      play($('.navigator'), [{opacity: 0, transform: depth ? 'translateX(-38px) scale(.94)' : 'translateX(-18px)'}, {opacity: 1, transform: 'translateX(0) scale(1)'}], {delay: 70, duration: 750}),
      play($('.terminal'), [{opacity: 0, transform: depth ? 'translateY(28px) scale(.965)' : 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0) scale(1)'}], {delay: 110, duration: 750}),
      play($('.ambient'), [{opacity: 0, transform: depth ? 'translateX(28px) translateY(14px)' : 'translateY(12px)'}, {opacity: 1, transform: 'translateX(0) translateY(0)'}], {delay: 210, duration: 750}),
      rise($('footer'), 270, 8, 520)
    ]);
  }

  function contentIn(direction) {
    const blocks = [...$('#content').children];
    const visible = blocks.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    // Only stagger the visible material; long CV sections remain immediately scrollable.
    return Promise.all([
      ...visible.map((element, i) => rise(element, Math.min(i * 32, 160), direction * 12, 430)),
      rise($('#terminal-file'), 0, 0, 240),
      rise($('#current-path'), 0, 0, 240),
      play($('.terminal-scan'), [
        {opacity: 0, transform: 'scaleX(0)', offset: 0},
        {opacity: .65, transform: 'scaleX(.55)', offset: .35},
        {opacity: 0, transform: 'scaleX(1)', offset: 1}
      ], {duration: 620})
    ]);
  }

  async function route({initial, sceneChange, toIntro, direction, commit, unchanged}) {
    const id = ++routeId;
    matrix.cancel();
    cancel('route');
    $('#content').removeAttribute('aria-busy');
    if (unchanged) return;
    if (isStill()) { commit(); return; }
    if (initial) {
      commit();
      await (toIntro ? introIn() : workspaceIn());
      return;
    }
    $('#content').setAttribute('aria-busy', 'true');
    if (sceneChange) {
      const outgoing = $(toIntro ? '#portfolio' : '#intro');
      let entrance = Promise.resolve();
      // Change the page only when every code column has covered the viewport.
      const curtain = matrix.run({toIntro, onCover() {
        if (id !== routeId) return;
        cancel('route');
        commit();
        entrance = toIntro ? introIn() : workspaceIn(true);
      }});
      play(outgoing, [{opacity: 1, transform: 'scale(1)'}, {opacity: .05, transform: toIntro ? 'scale(.95)' : 'scale(1.075)'}], {duration: 700, easing: 'cubic-bezier(.4,0,.2,1)'});
      await curtain;
      if (id !== routeId) return;
      await entrance;
      if (id === routeId) $('#content').removeAttribute('aria-busy');
      return;
    }
    const outgoing = $('#content');
    let menuExit = Promise.resolve();
    const closingMenu = innerWidth <= 680 && $('.navigator').classList.contains('open');
    if (closingMenu) {
      $('.mobile-nav').setAttribute('aria-expanded', 'false');
      menuExit = menu(false);
    }
    await Promise.all([menuExit, play(outgoing, [
      {opacity: 1, transform: 'translateY(0)'},
      {opacity: 0, transform: `translateY(${direction * -8}px)`}
    ], {duration: closingMenu ? 320 : 125, easing: 'cubic-bezier(.4,0,1,1)'})]);
    if (id !== routeId) return;
    commit();
    await contentIn(direction);
    if (id === routeId) $('#content').removeAttribute('aria-busy');
  }

  async function dialog(open) {
    const id = ++dialogId, element = $('#theme-dialog');
    cancel('dialog');
    element.classList.toggle('closing', !open);
    if (open) element.showModal();
    await play(element, open ? [
      {opacity: 0, transform: 'translateY(12px) scale(.97)'},
      {opacity: 1, transform: 'translateY(0) scale(1)'}
    ] : [
      {opacity: 1, transform: 'translateY(0) scale(1)'},
      {opacity: 0, transform: 'translateY(6px) scale(.985)'}
    ], {duration: open ? 360 : 160}, 'dialog');
    if (id === dialogId && !open) { element.close(); element.classList.remove('closing'); }
  }

  async function menu(open) {
    const id = ++menuId, element = $('.navigator');
    const from = element.getBoundingClientRect().height;
    cancel('menu');
    element.classList.add('open', 'menu-moving');
    const to = open ? element.scrollHeight : 0;
    await play(element, [{height: `${from}px`, opacity: open ? 0 : 1}, {height: `${to}px`, opacity: open ? 1 : 0}], {duration: 320}, 'menu');
    if (id === menuId) { element.classList.toggle('open', open); element.classList.remove('menu-moving'); }
  }

  function closeMenu() {
    ++menuId;
    cancel('menu');
    $('.navigator').classList.remove('open', 'menu-moving');
    $('.mobile-nav').setAttribute('aria-expanded', 'false');
  }

  return {route, dialog, menu, closeMenu, finish() {
    matrix.finish();
    // Finishing, rather than delaying or rejecting, also settles an in-flight route.
    for (const animations of groups.values()) for (const animation of animations) animation.finish();
  }};
}
