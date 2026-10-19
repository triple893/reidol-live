(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.ReidolGames||={}).bbq=api;})(globalThis,function(){
  'use strict';
  function gradeMeat(age,{cookedAt=2,burntAt=4}={}){return !Number.isFinite(age)||age<cookedAt?'raw':age<burntAt?'cooked':'burnt';}
  function score({cooked=0,raw=0,burnt=0,hits=0,dodges=0}){
    const n=v=>Math.max(0,Math.floor(Number(v)||0));[cooked,raw,burnt,hits,dodges]=[cooked,raw,burnt,hits,dodges].map(n);
    return {correct:Math.max(0,cooked+dodges-raw-2*burnt-2*hits),attempts:cooked+raw+burnt+hits+dodges};
  }
  const laneForRatio=x=>Math.max(0,Math.min(2,Math.floor((Number.isFinite(x)?x:0)*3)));
  function mount(container,{seconds=90,cookedAt=2,burntAt=4,onFinish,onCancel,asset,point,now=()=>performance.now(),rng=Math.random}){
    const start=now();let dead=false,lane=1,dropAt=start,dropLane=Math.floor(rng()*3),pointer=null;
    const totals={cooked:0,raw:0,burnt:0,hits:0,dodges:0};
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    container.classList.add('wave2-game');node('h2','白Tを守れBBQ');node('p','肉は焼けたらタップ。白Tは左右のボタンかドラッグで動かし、飛んでくるタレをよけよう。');
    const timer=node('p',''),scene=node('div','');scene.className='w2-bbq';
    const grill=node('div','',scene);grill.className='w2-grill';grill.style.backgroundImage=`url("${asset('a4_bbq_grill_bg')}")`;
    const born=Array.from({length:4},()=>start-rng()*2500),last=Array(4).fill('');
    const meat=born.map((_,i)=>{const b=node('button','',grill);b.type='button';b.setAttribute('aria-label',`肉${i+1}を返す`);const img=node('img','',b);b.onclick=()=>{if(dead)return;if(now()-start>=seconds*1000){finish();return;}const grade=gradeMeat((now()-born[i])/1000,{cookedAt,burntAt});totals[grade]++;feedback.textContent=grade==='cooked'?'焼けた肉を返せた！':grade==='raw'?'まだ生焼け！ 減点':'焦げた！ 減点';born[i]=now();update();};return img;});
    const dodge=node('div','',scene);dodge.className='w2-dodge';dodge.setAttribute('aria-label','白Tを動かす場所');
    const sauce=node('span','●',dodge);sauce.className='w2-sauce';sauce.setAttribute('aria-hidden','true');
    const shirt=node('img','',dodge);shirt.src=asset('a4_white_tshirt');shirt.alt='白いTシャツ';shirt.className='w2-shirt';
    const controls=node('div','');controls.className='ux-actions';const left=node('button','← 左へ',controls),right=node('button','右へ →',controls);left.type=right.type='button';left.className=right.className='btn sec';
    const feedback=node('p','');feedback.setAttribute('role','status');const cancel=node('button','やめて一覧へ');cancel.type='button';cancel.className='btn sec';
    function move(next){lane=Math.max(0,Math.min(2,next));shirt.style.left=`${lane*33.333+16.666}%`;}
    function movePointer(e){if(!point)return;const p=point(e),r=dodge.getBoundingClientRect(),a=point({clientX:r.left,clientY:r.top}),b=point({clientX:r.right,clientY:r.bottom});const low=Math.min(a.x,b.x),width=Math.abs(b.x-a.x);if(width>0)move(laneForRatio((p.x-low)/width));}
    dodge.onpointerdown=e=>{pointer=e.pointerId;dodge.setPointerCapture(e.pointerId);movePointer(e);e.preventDefault();};
    dodge.onpointermove=e=>{if(pointer===e.pointerId){movePointer(e);e.preventDefault();}};dodge.onpointerup=dodge.onpointercancel=()=>{pointer=null;};
    const key=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(lane+(e.key==='ArrowLeft'?-1:1));}};
    document.addEventListener('keydown',key);left.onclick=()=>move(lane-1);right.onclick=()=>move(lane+1);
    function stop(){dead=true;clearInterval(interval);document.removeEventListener('keydown',key);dodge.onpointerdown=dodge.onpointermove=dodge.onpointerup=dodge.onpointercancel=null;container.classList.remove('wave2-game');}
    function finish(){if(dead)return;stop();onFinish(score(totals));}
    function update(){if(dead)return;const t=(now()-start)/1000;if(t>=seconds){finish();return;}
      meat.forEach((img,i)=>{const grade=gradeMeat((now()-born[i])/1000,{cookedAt,burntAt});if(last[i]!==grade){last[i]=grade;img.src=asset('a4_meat_'+grade);img.alt={raw:'生の肉',cooked:'焼けた肉',burnt:'焦げた肉'}[grade];}});
      const drop=(now()-dropAt)/1500;
      if(drop>=1){if(lane===dropLane){totals.hits++;feedback.textContent='タレが付いた！ 減点';}else totals.dodges++;dropAt=now();dropLane=Math.floor(rng()*3);}
      sauce.style.left=`${dropLane*33.333+16.666}%`;sauce.style.top=`${Math.min(1,(now()-dropAt)/1500)*75}%`;
      timer.textContent=`残り${Math.ceil(seconds-t)}秒 · 焼けた肉${totals.cooked} · 焦げ${totals.burnt} · タレ${totals.hits} · よけた数${totals.dodges}`;
    }
    const interval=setInterval(update,80);cancel.onclick=()=>{if(!dead){stop();onCancel();}};move(1);update();return stop;
  }
  return {gradeMeat,score,laneForRatio,mount};
});
