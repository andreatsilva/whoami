import {createMotion,navArt} from './motion.js';
import {createTransitions} from './transitions.js';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function boot(sections){
  const media=matchMedia('(prefers-reduced-motion: reduce)'),motion=createMotion();
  let active=0,paused=media.matches,lastWheel=0,drag=null,suppressClick=false,displayedRoute=null;
  const transitions=createTransitions(()=>paused);
  const themes={blackmoney:['#0c0d0b','#d9d7be','#a4b695','#c39978'],nord:['#151d27','#d1deeb','#8bbfca','#bfa1cd'],phosphor:['#080e0a','#b4d5ab','#9bce86','#c3b37b'],paper:['#e9e7dc','#323b2d','#426844','#8d5c3f']};
  const files=['whoami.md','experience.log','selected-work/','homelab.conf','stack.conf','education.md','contact.vcf','appearance.conf'];
  function renderThemes(){for(const container of [$('#theme-options'),$('#inline-themes')]){if(!container)continue;if(!container.children.length)container.innerHTML=Object.entries(themes).map(([name,colors])=>`<button type="button" class="theme-option" data-theme-name="${name}"><span>${name}</span><span class="swatches">${colors.map(color=>`<i style="background:${color}"></i>`).join('')}</span></button>`).join('');container.querySelectorAll('[data-theme-name]').forEach(button=>button.setAttribute('aria-pressed',String(document.documentElement.dataset.theme===button.dataset.themeName)));}}
  function setTheme(name,animate=true){if(!themes[name])return;document.documentElement.classList.toggle('theme-shifting',animate&&!paused);document.documentElement.dataset.theme=name;document.querySelectorAll('.theme-name').forEach(x=>x.textContent=name);$('meta[name="theme-color"]').content=themes[name][0];try{localStorage.setItem('andre-theme',name)}catch{}renderThemes();motion.refreshColors(animate&&!paused?700:0);}
  function setPaused(value){paused=value;document.body.classList.toggle('paused',value);document.documentElement.classList.toggle('theme-shifting',!value);document.querySelectorAll('.motion-button').forEach(button=>{button.textContent=`motion: ${value?'off':'on'}`;button.setAttribute('aria-pressed',String(value));});motion.setPaused(value);if(value){transitions.finish();motion.refreshColors();renderCode(true);}}
  media.addEventListener('change',e=>setPaused(e.matches));
  $('#wheel').innerHTML=sections.map((s,i)=>`<button class="section-card" data-index="${i}" aria-label="${s.name}"><span class="card-art">${navArt(i)}</span><span class="card-label"><span>${s.name}</span><small>${String(i).padStart(2,'0')}</small></span></button>`).join('');
  function wheel(){document.querySelectorAll('.section-card').forEach((button,i)=>{let offset=i-active;if(offset>4)offset-=8;if(offset< -3)offset+=8;button.style.transform=`translate(${offset*offset*4}px,${offset*102-45}px) rotate(${-offset*6}deg)`;button.style.opacity=String(Math.max(.13,1-Math.abs(offset)*.23));button.style.zIndex=String(5-Math.abs(offset));button.classList.toggle('selected',i===active);button.setAttribute('aria-current',i===active?'page':'false');});}
  function route(){
    const id=location.hash.slice(1)||'intro',isIntro=id==='intro',previous=sections.findIndex(s=>s.id===displayedRoute);
    if(!isIntro){const index=sections.findIndex(s=>s.id===id);if(index<0){location.replace('#about');return;}active=index;wheel();}
    const index=active,initial=displayedRoute===null,sceneChange=(displayedRoute==='intro')!==isIntro,originFocus=document.activeElement;
    let distance=index-previous;if(distance>4)distance-=8;if(distance< -4)distance+=8;
    transitions.route({initial,sceneChange,toIntro:isIntro,direction:distance<0?-1:1,unchanged:id===displayedRoute,commit(){
      const focused=document.activeElement,moveFocus=!initial&&(focused.closest('#intro,#content')||isIntro&&focused.closest('#portfolio')||innerWidth<=680&&originFocus.closest('#wheel'));
      $('#intro').hidden=!isIntro;$('#portfolio').hidden=isIntro;document.body.dataset.scene=isIntro?'intro':'portfolio';
      if(!isIntro){$('#content').innerHTML=sections[index].content();$('.terminal-scroll').scrollTop=0;$('#command').value='';$('#command-result').textContent='';$('#current-path').textContent=sections[index].name;$('#terminal-file').textContent=files[index];$('#section-count').textContent=`${String(index+1).padStart(2,'0')} / 08`;document.title=`André Silva — ${sections[index].name}`;transitions.closeMenu();renderThemes();}
      else document.title='André Silva — IT & Infrastructure';
      displayedRoute=id;motion.setScene(isIntro,index);window.scrollTo({top:0,behavior:'instant'});
      if(moveFocus)$(isIntro?'.enter':'#content').focus({preventScroll:true});
    }});
  }
  function navigate(delta){location.hash=sections[(active+delta+sections.length)%sections.length].id;}
  addEventListener('hashchange',route);
  document.addEventListener('click',async event=>{
    const card=event.target.closest('[data-index]');if(card){if(suppressClick){suppressClick=false;return;}location.hash=sections[Number(card.dataset.index)].id;return;}
    if(event.target.closest('.theme-button')){renderThemes();transitions.dialog(true);}
    const theme=event.target.closest('[data-theme-name]');if(theme)setTheme(theme.dataset.themeName);
    if(event.target.closest('.motion-button'))setPaused(!paused);
    if(event.target.closest('#copy-email')){try{await navigator.clipboard.writeText('andreatsilva@proton.me');$('#copy-email').textContent='copied ✓';}catch{$('#command-result').textContent='Email: andreatsilva@proton.me';}}
  });
  $('.mobile-nav').addEventListener('click',()=>{const open=$('.mobile-nav').getAttribute('aria-expanded')!=='true';$('.mobile-nav').setAttribute('aria-expanded',String(open));transitions.menu(open);});
  $('#theme-dialog').addEventListener('cancel',event=>{event.preventDefault();transitions.dialog(false);});
  $('#theme-dialog form').addEventListener('submit',event=>{event.preventDefault();transitions.dialog(false);});
  $('.navigator').addEventListener('wheel',event=>{if(innerWidth<=680||Math.abs(event.deltaY)<3)return;event.preventDefault();if(Date.now()-lastWheel<260)return;lastWheel=Date.now();navigate(event.deltaY>0?1:-1);},{passive:false});
  const nav=$('.navigator');nav.addEventListener('pointerdown',e=>{if(innerWidth<=680||e.button!==0)return;drag={y:e.clientY,id:e.pointerId};suppressClick=false;});
  nav.addEventListener('pointermove',e=>{if(!drag)return;const distance=e.clientY-drag.y;if(Math.abs(distance)>45){suppressClick=true;drag.y=e.clientY;navigate(distance<0?1:-1);}});
  addEventListener('pointerup',()=>{drag=null;setTimeout(()=>suppressClick=false,0);});
  document.addEventListener('keydown',event=>{if($('#theme-dialog').open)return;if(event.target.matches('input,textarea,select')){if(event.key==='Escape')event.target.blur();return;}if(event.key==='Enter'&&!$('#intro').hidden&&!event.target.closest('a,button')){location.hash='about';event.preventDefault();}if(!$('#portfolio').hidden){if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!event.target.closest('.terminal-scroll')){event.preventDefault();navigate(event.key==='ArrowDown'?1:-1);}if(event.key===':'||event.key==='/'){event.preventDefault();$('#command').focus();}}});
  $('#command-form').addEventListener('submit',event=>{event.preventDefault();const raw=$('#command').value.trim().toLowerCase().replace(/^:/,'');const aliases={whoami:'about',work:'experience',stack:'skills',cv:'download',ls:'help'};const command=aliases[raw]||raw;
    if(sections.some(s=>s.id===command)){location.hash=command;$('#command').blur();}
    else if(command==='theme'){renderThemes();transitions.dialog(true);}
    else if(command==='download')$('a[download]').click();
    else if(command==='help')$('#command-result').textContent='about · experience · projects · homelab\nskills · education · contact · themes\ntheme · motion · download · clear · home';
    else if(command==='motion')setPaused(!paused);
    else if(command==='home')location.hash='intro';
    else if(command==='clear')$('#command-result').textContent='';
    else if(command.startsWith('theme ')){const name=command.split(' ')[1];if(themes[name])setTheme(name);else $('#command-result').textContent='Available: '+Object.keys(themes).join(' · ');}
    else if(raw)$('#command-result').textContent=`Unknown command: ${raw}. Type help.`;
    $('#command').value='';
  });
  const snippets=[['const andre = {','  basedIn: "Lisbon, Portugal",','  experience: "6+ years",','  focus: ["people", "systems"],','  always: "learning"','};'],['const infrastructure = [','  "Microsoft 365", "Entra ID",','  "Intune", "Active Directory",','  "Fortinet", "Ubiquiti"','];','','connect(people, systems);'],['const build = {','  languages: ["C#", "JS", "Python"],','  tools: ["Docker", "Git"],','  process: "test, learn, improve"','};','','await build.somethingUseful();']];
  let snippet=0,typed=28,hold=0;
  function renderCode(full=false){const lines=snippets[snippet],code=lines.join('\n');const visible=full?code:code.slice(0,typed);$('#code').innerHTML=visible.split('\n').map((line,i)=>`<span class="code-row"><i>${String(i+1).padStart(2,'0')}</i>${escape(line).replace(/(&quot;.*?&quot;)/g,'<span class="string">$1</span>').replace(/\b(const|await)\b/g,'<span class="keyword">$1</span>')}</span>`).join('');$('#cursor-position').textContent=`${visible.split('\n').length}:${(visible.split('\n').at(-1)||'').length+1}`;}
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  function clock(){const now=new Date();$('#clock').textContent=formatter.format(now);$('#clock').dateTime=now.toISOString();}
  setInterval(()=>{if(paused||document.hidden||$('#intro').hidden)return;const length=snippets[snippet].join('\n').length;if(typed<length){typed+=2;renderCode();}else if(++hold>32){snippet=(snippet+1)%snippets.length;typed=0;hold=0;}},80);
  setInterval(()=>{if(!document.hidden)clock();},1000);
  let savedTheme='blackmoney';try{const stored=localStorage.getItem('andre-theme');if(themes[stored])savedTheme=stored;}catch{}
  renderCode(paused);setTheme(savedTheme,false);setPaused(paused);clock();route();
}
