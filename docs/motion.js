// Seeded, original line studies. One frame loop, paused off-screen or by the user.
const TAU=Math.PI*2, clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const mix=(a,b,t)=>a+(b-a)*t;
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function bezier(a,b,c,d,t){const u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};}
function stroke(ctx,points,color,alpha,width=1,count=points.length){if(count<2)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<count;i++)ctx.lineTo(points[i].x,points[i].y);ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();ctx.globalAlpha=1;}

export function createMotion(){
  let paused=false, intro=true, time=0, last=0, frame=0, startGrowth=0, section=0, colors={},pointer={x:0,y:0},smooth={x:0,y:0};
  let surfaces=new Map(),lastPaint=0,colorUntil=0,scrollDepth=0,startSignature=0;
  const rootStyle=document.documentElement.style,scroller=document.querySelector('.terminal-scroll');
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
  const observer=new ResizeObserver(entries=>{for(const e of entries){const s=surfaces.get(e.target);if(s){s.w=e.contentRect.width;s.h=e.contentRect.height;s.dirty=true;}}request();});
  function attach(){for(const canvas of document.querySelectorAll('#signature,#growth,#branch,#orbit,#signal')){if(surfaces.has(canvas))continue;const s={canvas,ctx:canvas.getContext('2d'),w:0,h:0,dirty:true};surfaces.set(canvas,s);observer.observe(canvas);}for(const [canvas] of surfaces)if(!canvas.isConnected){observer.unobserve(canvas);surfaces.delete(canvas);}refreshColors();}
  function readColors(){const css=getComputedStyle(document.documentElement);for(const key of ['fg','dim','line','green','red','bg'])colors[key]=css.getPropertyValue('--'+key).trim();}
  function refreshColors(duration=0){colorUntil=Math.max(colorUntil,performance.now()+duration);readColors();request();}
  function prepare(s){if(s.w<1||s.h<1)return false;const dpr=Math.min(devicePixelRatio||1,2);if(s.dirty){s.canvas.width=Math.round(s.w*dpr);s.canvas.height=Math.round(s.h*dpr);s.dirty=false;}s.ctx.setTransform(dpr,0,0,dpr,0,0);s.ctx.clearRect(0,0,s.w,s.h);return true;}
  function dot(ctx,x,y,r,alpha=1,color=colors.fg){ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;}
  function cross(ctx,x,y,size=3){ctx.strokeStyle=colors.line;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);ctx.moveTo(x,y-size);ctx.lineTo(x,y+size);ctx.stroke();}
  function signature(s){
    const{ctx,w,h}=s;const unit=Math.min(w,h*1.12),cx=w*.5,cy=h*.48,age=time-startSignature;
    const settle=paused?1:clamp(age/2.8),phase=paused?0:time;
    // Sparse registration marks and an orbital sweep sit behind the letter strokes.
    ctx.save();ctx.translate(cx-smooth.x*5,cy-smooth.y*4);
    const ring=unit*.435,rotation=phase*.085;
    for(let i=0;i<96;i++){
      const a=i/96*TAU,major=i%8===0,length=major?6:2;
      const activity=Math.pow((Math.cos(a-rotation)+1)/2,18);
      stroke(ctx,[{x:Math.cos(a)*ring,y:Math.sin(a)*ring*.78},{x:Math.cos(a)*(ring+length),y:Math.sin(a)*(ring+length)*.78}],major?colors.dim:colors.line,(.25+activity*.45)*settle,.65);
    }
    for(let lane=0;lane<2;lane++){
      const radius=ring*(lane?1.065:.955),angle=(lane?-phase*.065:rotation)+lane*Math.PI;
      ctx.strokeStyle=colors.green;ctx.globalAlpha=(lane?.22:.42)*settle;ctx.lineWidth=.7;
      ctx.beginPath();ctx.ellipse(0,0,radius,radius*.78,0,angle,angle+.34);ctx.stroke();
      dot(ctx,Math.cos(angle+.34)*radius,Math.sin(angle+.34)*radius*.78,1.25,.7*settle,colors.green);
    }
    ctx.globalAlpha=1;ctx.restore();
    ctx.save();ctx.translate(cx+smooth.x*3,cy+smooth.y*2);const rad=unit*.39;
    ctx.strokeStyle=colors.line;ctx.lineWidth=.5;ctx.setLineDash([1,6]);ctx.beginPath();ctx.ellipse(0,0,rad,rad*.78,-.22,0,TAU);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<56;i++){const a=i/56*TAU;const r=rad*(1+.035*Math.sin(i));dot(ctx,Math.cos(a)*r,Math.sin(a)*r*.78,.6,.3);}
    // Three polyline strokes make an individual, open AS monogram.
    const paths=[[[.12,.77],[.33,.22],[.53,.77]],[[.2,.58],[.46,.58]],[[.83,.24],[.61,.24],[.53,.47],[.78,.56],[.69,.77],[.45,.77]]];
    for(let p=0;p<paths.length;p++){
      const line=paths[p];
      for(let j=0;j<18;j++){
        let points=[];for(let i=0;i<line.length-1;i++)for(let k=0;k<20;k++){
          const t=k/19,shift=(j-8.5)*.0045;const flutter=Math.sin(time*.55+j*.4+t*2+p)*.0025*Math.sin(t*Math.PI);
          points.push({x:(mix(line[i][0],line[i+1][0],t)-.5+shift+flutter)*unit*.95,y:(mix(line[i][1],line[i+1][1],t)-.5+shift*.65)*unit*.95});
        }
        const reveal=paused?1:clamp((age-j*.035-p*.15)/2.6);
        stroke(ctx,points,j%5===0?colors.green:colors.fg,.22+(j%4)*.03,.7,Math.floor(points.length*reveal));
        if(reveal===1&&j%6===0){
          const idx=Math.floor(((phase*.055+j*.11)%1)*(points.length-1));
          for(let tail=5;tail>=0;tail--){const point=points[Math.max(0,idx-tail)];dot(ctx,point.x,point.y,tail? .7:1.2,(1-tail/6)*.75,colors.green);}
        }
      }
    }
    const rand=random(903);
    for(let i=0;i<72;i++){
      const a=rand()*TAU,r=unit*(.3+rand()*.19),x=Math.cos(a)*r,y=Math.sin(a)*r*.75;
      const inner=unit*.23;const points=[];
      for(let j=0;j<=20;j++){let t=j/20;points.push(bezier({x:Math.cos(a)*inner,y:Math.sin(a)*inner*.7},{x:x*.65,y:y*.2},{x:x*.92+Math.sin(time*.3+i)*2,y:y*.8},{x,y},t));}
      const alpha=.05+rand()*.1,nodeSize=rand()>.85?1.4:.6;
      const grown=paused?1:clamp((age-.5-i*.012)/1.8);
      stroke(ctx,points,colors.fg,alpha,.55,Math.floor(points.length*grown));
      dot(ctx,x,y,nodeSize,.35*grown);
      if(grown===1&&i%6===0){
        const travel=(phase*.16+i*.137)%1,index=Math.floor(travel*(points.length-1));
        for(let tail=3;tail>=0;tail--){const point=points[Math.max(0,index-tail)];dot(ctx,point.x,point.y,tail?.6:1.1,(1-tail/4)*.65,colors.green);}
        const pulse=clamp((travel-.7)/.3);
        ctx.globalAlpha=(1-pulse)*pulse*.9;ctx.strokeStyle=colors.green;ctx.lineWidth=.6;
        ctx.beginPath();ctx.arc(x,y,2+pulse*7,0,TAU);ctx.stroke();ctx.globalAlpha=1;
      }
    }
    ctx.restore();cross(ctx,20,h*.5);cross(ctx,w-20,h*.5);cross(ctx,w*.5,52);cross(ctx,w*.5,h-50);
  }
  function garden(s){
    const{ctx,w,h}=s;const rand=random(184),root={x:w*.27,y:h*.83},progress=paused?1:clamp((time-startGrowth)/2.8);
    ctx.save();ctx.beginPath();ctx.rect(14,32,w-28,h-64);ctx.clip();
    for(let x=28;x<w;x+=24)for(let y=42;y<h-20;y+=24)dot(ctx,x,y,.45,.18,colors.dim);
    for(let j=0;j<38;j++){
      const spread=j/37,a=-2.4+spread*2.3,reach=h*(.4+rand()*.34);
      const end={x:root.x+Math.cos(a)*reach*(w/h)*.56,y:root.y+Math.sin(a)*reach};
      const points=[];const begin={x:root.x+(rand()-.5)*5,y:root.y};
      for(let k=0;k<=44;k++){
        const t=k/44;const point=bezier(begin,{x:root.x-18,y:h*.43},{x:end.x-35,y:end.y+20},end,t);
        point.x+=Math.sin(time*.45+j*.3+t*4)*2*t*t+smooth.x*5*t;point.y+=Math.sin(time*.33+j*.13)*1.3*t;points.push(point);
      }
      const grow=clamp(progress*1.5-spread*.5),count=Math.floor(grow*points.length);
      stroke(ctx,points,j%6===0?colors.green:colors.fg,.17+(j%5)*.055,j%7===0?1:.55,count);
      if(count>1){const tip=points[count-1];dot(ctx,tip.x,tip.y,j%6===0?1.35:.65,.5);}
      if(grow===1){
        for(let n=0;n<2;n++){const index=Math.floor(((time*.07+j*.027+n*.5)%1)*44),point=points[index];dot(ctx,point.x,point.y,1,.7,colors.green);}
        for(let n=0;n<3;n++){const idx=22+n*6,origin=points[idx],tip={x:origin.x+(end.x-root.x)*.14,y:origin.y-8-rand()*12};stroke(ctx,[origin,tip],colors.fg,.17,.55);dot(ctx,tip.x,tip.y,.65,.32);}
      }
    }
    const rootLine=[{x:root.x,y:h*.83},{x:root.x,y:h*.89},{x:root.x+17,y:h*.89}];stroke(ctx,rootLine,colors.green,.65,.8);
    ctx.font='8px "Plex Mono",monospace';ctx.fillStyle=colors.dim;ctx.fillText('root / AS',root.x+21,h*.9);
    ctx.setLineDash([2,5]);stroke(ctx,[{x:20,y:h*.48},{x:w-20,y:h*.48}],colors.line,.65,.6);ctx.setLineDash([]);
    ctx.restore();
  }
  function branch(s){
    const{ctx,w,h}=s,rand=random(782);const spine=[];
    for(let i=0;i<=70;i++){const t=i/70,y=t*h,x=25+Math.pow((t-.5)*2,2)*48+Math.sin(time*.28+t*8)*1.5;spine.push({x,y});}
    stroke(ctx,spine,colors.fg,.5,.85);
    for(let i=0;i<90;i++){
      const t=rand(),origin=spine[Math.floor(t*70)],direction=rand()>.35?-1:1,length=8+rand()*36;
      const tip={x:origin.x+direction*length,y:origin.y-(10+rand()*40)};
      const pts=[];for(let n=0;n<=10;n++){const u=n/10;pts.push(bezier(origin,{x:origin.x,y:origin.y-12},{x:tip.x+10,y:tip.y+8}, {x:tip.x+Math.sin(time*.4+i)*u*1.4,y:tip.y},u));}
      stroke(ctx,pts,colors.fg,.11+rand()*.15,.6);dot(ctx,tip.x,tip.y,.65,.35);
    }
    const y=h*.5+5,x=25;dot(ctx,x,y,3.5,.9,colors.green);ctx.strokeStyle=colors.green;ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(x,y,7+Math.sin(time*1.4)*2,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    for(let i=0;i<5;i++){const idx=Math.floor(((time*.04+i*.2)%1)*70);dot(ctx,spine[idx].x,spine[idx].y,1,.85);}
  }
  function orbit(s){
    const{ctx,w,h}=s,r=Math.min(w*.44,h*.39),rotation=time*.16+smooth.x*.3,tilt=.28+smooth.y*.15;const points=[];
    for(let lat=1;lat<18;lat++)for(let lon=0;lon<36;lon++){
      const a=lat/18*Math.PI,b=lon/36*TAU+rotation;const x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);
      points.push({x,y:y*Math.cos(tilt)-z*Math.sin(tilt),z:y*Math.sin(tilt)+z*Math.cos(tilt),lat,lon});
    }
    ctx.font='7px "Plex Mono",monospace';ctx.textAlign='center';points.sort((a,b)=>a.z-b.z);
    for(const p of points){ctx.globalAlpha=.12+(p.z+1)*.34;ctx.fillStyle=p.lon%9===0?colors.green:colors.fg;ctx.fillText(p.lat%3===0?'·':p.lon%9===0?'+':':',w/2+p.x*r,h*.48+p.y*r);}
    ctx.globalAlpha=.35;ctx.strokeStyle=colors.dim;ctx.beginPath();ctx.ellipse(w/2,h*.48,r*1.13,r*.25,-.35,0,TAU);ctx.stroke();ctx.globalAlpha=1;ctx.textAlign='start';cross(ctx,w/2,h-13,3);
  }
  function signal(s){const{ctx,w,h}=s;for(let i=0;i<35;i++){const value=(Math.sin(time*1.2-i*.32)+1)*.25+(Math.sin(i*1.7+time*.45)+1)*.16;const height=2+value*(h-5)*Math.exp(-(((i-18)/15)**2));ctx.fillStyle=i===section*4?colors.green:colors.fg;ctx.globalAlpha=.3+value*.4;ctx.fillRect(i*w/35,h-height,1,height);}ctx.globalAlpha=1;}
  function draw(){if(colorUntil){readColors();if(performance.now()>=colorUntil)colorUntil=0;}if(!paused){smooth.x+=(pointer.x-smooth.x)*.065;smooth.y+=(pointer.y-smooth.y)*.065;scrollDepth+=(Math.min(240,intro?scrollY:(innerWidth<=680?scrollY:scroller.scrollTop))-scrollDepth)*.1;rootStyle.setProperty('--parallax-x',smooth.x.toFixed(4));rootStyle.setProperty('--parallax-y',smooth.y.toFixed(4));rootStyle.setProperty('--scene-scroll',scrollDepth.toFixed(2)+'px');}for(const s of surfaces.values()){
      const id=s.canvas.id;if((intro&&id!=='signature')||(!intro&&id==='signature')||!s.canvas.checkVisibility())continue;
      if(!prepare(s))continue;({signature,growth:garden,branch,orbit,signal}[id])?.(s);
    }}
  function tick(now){frame=0;if(document.hidden)return;const delta=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused)time+=delta;if(paused||now-lastPaint>=1000/30){draw();lastPaint=now;}if(!paused)frame=requestAnimationFrame(tick);}
  function request(){if(!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
  document.addEventListener('pointermove',e=>{if(!finePointer.matches||e.pointerType==='touch')return;pointer.x=clamp((e.clientX/innerWidth-.5)*2,-1,1);pointer.y=clamp((e.clientY/innerHeight-.5)*2,-1,1);},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  finePointer.addEventListener('change',()=>{pointer={x:0,y:0};});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();});
  return {attach,refreshColors,setScene(value,index=0){if(value&&!intro)startSignature=time;intro=value;section=index;startGrowth=time;scrollDepth=0;rootStyle.setProperty('--scene-scroll','0px');attach();request();},setPaused(value){paused=value;document.body.classList.toggle('parallax-enabled',!value);if(paused){cancelAnimationFrame(frame);frame=0;rootStyle.setProperty('--parallax-x','0');rootStyle.setProperty('--parallax-y','0');rootStyle.setProperty('--scene-scroll','0px');}request();},destroy(){cancelAnimationFrame(frame);observer.disconnect();surfaces.clear();}};
}

export function navArt(index){
  const content=[
    '<path d="M49 49 67 12 84 49M55 37h23M113 13H94L87 29l24 6-9 14H81" stroke-width="1.8"/><path class="active-line" d="M49 49 67 12 84 49M113 13H94L87 29l24 6-9 14H81"/>',
    '<path d="M24 32H133M35 22v20M56 17v30M80 12v40M105 20v23M127 25v14"/><path class="active-line" d="M24 32H133"/><circle cx="80" cy="32" r="5"/>',
    '<rect x="30" y="13" width="100" height="40"/><path d="M30 22h100M37 17h2m4 0h2m4 0h2M40 31l8 5-8 5m18 1h21"/><path class="active-line" d="M89 43h30V30H89z"/>',
    '<rect x="66" y="8" width="29" height="16"/><path d="M80 24v10H42v9m38-9h38v9m-38-9v9"/><path class="active-line" d="M80 16v18h38v10"/><rect x="31" y="43" width="23" height="13"/><rect x="68" y="43" width="23" height="13"/><rect x="106" y="43" width="23" height="13"/>',
    '<path d="m80 10 42 14-42 15-42-15zM38 34l42 15 42-15M38 44l42 15 42-15"/><path class="active-line" d="m38 24 42 15 42-15"/>',
    '<path d="m28 25 52-15 52 15-52 16zM47 32v16q33 16 66 0V32M131 25v25"/><path class="active-line" d="m28 25 52-15 52 15-52 16z"/>',
    '<rect x="37" y="14" width="88" height="41"/><path d="m37 14 44 29 44-29M37 55l29-23m59 23-29-23"/><path class="active-line" d="m37 14 44 29 44-29"/>',
    '<circle cx="80" cy="32" r="22"/><path d="M80 10a22 22 0 0 0 0 44z" fill="currentColor" opacity=".4"/><path d="M45 32H28m104 0h-17M80 0v5m0 54v5"/>'
  ];return `<svg viewBox="0 0 160 64" aria-hidden="true">${content[index]}</svg>`;
}
