(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.ReidolGames||={}).bbq=api;})(globalThis,function(){
  'use strict';
  function gradeMeat(age,{cookedAt=2,burntAt=4}={}){return !Number.isFinite(age)||age<cookedAt?'raw':age<burntAt?'cooked':'burnt';}
  function score({cooked=0,raw=0,burnt=0,hits=0,dodges=0}){
    const n=v=>Math.max(0,Math.floor(Number(v)||0));[cooked,raw,burnt,hits,dodges]=[cooked,raw,burnt,hits,dodges].map(n);
    return {correct:Math.max(0,cooked+dodges-raw-2*burnt-2*hits),attempts:cooked+raw+burnt+hits+dodges};
  }
  const laneForRatio=x=>Math.max(0,Math.min(2,Math.floor((Number.isFinite(x)?x:0)*3)));
  function mount(container,{seconds=90,cookedAt=2,burntAt=4,onFinish,onCancel,asset,point,now=()=>performance.now(),rng=Math.random,session}){
    const start=now();let dead=false,lane=1,dropAt=start,dropLane=Math.floor(rng()*3),pointer=null,interval,unwatch=()=>{},lastActive=4;
    const remaining=()=>session?session.remaining():Math.max(0,seconds-(now()-start)/1000),activeMeats=()=>session?3+session.level():4;
    const totals={cooked:0,raw:0,burnt:0,hits:0,dodges:0};
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    container.classList.add('wave2-game');node('h2','白Tを守れBBQ');node('p','焼けた肉をタップ。生→焼け→焦げ。白Tは左右のボタンかドラッグでタレをよけよう。').className='mini-rules';
    const timer=node('p',''),scene=node('div','');scene.className='w2-bbq';
    const grill=node('div','',scene);grill.className='w2-grill';grill.style.backgroundImage=`url("${asset('a4_bbq_grill_bg')}")`;
    const born=Array.from({length:session?6:4},()=>start-rng()*2500),last=Array(born.length).fill('');
    const meat=born.map((_,i)=>{const b=node('button','',grill);b.type='button';b.setAttribute('aria-label',`肉${i+1}を返す`);const img=node('img','',b);b.onclick=()=>{if(dead||i>=activeMeats())return;if(remaining()<=0){finish();return;}const age=(now()-born[i])/1000,grade=gradeMeat(age,{cookedAt,burntAt}),special=grade==='cooked'&&age<cookedAt+.25;totals[grade]++;session?.answer(grade==='cooked',{points:special?1.5:1,button:b,special});feedback.textContent=grade==='cooked'?(special?'ぴったりの焼き加減！':'焼けた肉を返せた！'):grade==='raw'?'まだ生焼け！ 減点':'焦げた！ 減点';if(special){b.classList.remove('bbq-perfect');void b.offsetWidth;b.classList.add('bbq-perfect');}born[i]=now();update();};return img;});
    const dodge=node('div','',scene);dodge.className='w2-dodge';dodge.setAttribute('aria-label','白Tを動かす場所');
    const sauce=node('span','●',dodge);sauce.className='w2-sauce';sauce.setAttribute('aria-hidden','true');
    const shirt=node('img','',dodge);shirt.src=asset('a4_white_tshirt');shirt.alt='白いTシャツ';shirt.className='w2-shirt';
    const stain=node('span','',dodge);stain.className='bbq-stain';stain.setAttribute('aria-hidden','true');stain.hidden=true;let stainUntil=0;
    const controls=node('div','');controls.className='ux-actions';const left=node('button','← 左へ',controls),right=node('button','右へ →',controls);left.type=right.type='button';left.className=right.className='btn sec';
    timer.className='mini-local-timer';const feedback=node('p','生 → 焼け（2秒〜4秒）→ 焦げ ／ タレは下へ飛んできます');feedback.setAttribute('role','status');const cancel=node('button','やめて一覧へ');cancel.type='button';cancel.className='btn sec mini-cancel';
    function move(next){lane=Math.max(0,Math.min(2,next));shirt.style.left=`${lane*33.333+16.666}%`;stain.style.left=shirt.style.left;}
    function movePointer(e){if(!point)return;const p=point(e),r=dodge.getBoundingClientRect(),a=point({clientX:r.left,clientY:r.top}),b=point({clientX:r.right,clientY:r.bottom});const low=Math.min(a.x,b.x),width=Math.abs(b.x-a.x);if(width>0)move(laneForRatio((p.x-low)/width));}
    dodge.onpointerdown=e=>{pointer=e.pointerId;dodge.setPointerCapture(e.pointerId);movePointer(e);e.preventDefault();};
    dodge.onpointermove=e=>{if(pointer===e.pointerId){movePointer(e);e.preventDefault();}};dodge.onpointerup=dodge.onpointercancel=()=>{pointer=null;};
    const key=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(lane+(e.key==='ArrowLeft'?-1:1));}};
    document.addEventListener('keydown',key);left.onclick=()=>move(lane-1);right.onclick=()=>move(lane+1);
    function stop(){if(dead)return;dead=true;clearInterval(interval);unwatch();document.removeEventListener('keydown',key);dodge.onpointerdown=dodge.onpointermove=dodge.onpointerup=dodge.onpointercancel=null;container.classList.remove('wave2-game');}
    function finish(){if(dead)return;stop();const stats=score(totals);if(session)session.end(stats);else onFinish(stats);}
    function update(){if(dead)return;if(remaining()<=0){finish();return;}const active=activeMeats();for(let i=lastActive;i<active;i++){born[i]=now();last[i]='';}lastActive=active;
      meat.forEach((img,i)=>{img.parentElement.hidden=i>=active;if(i>=active)return;const grade=gradeMeat((now()-born[i])/1000,{cookedAt,burntAt});if(last[i]!==grade){last[i]=grade;img.src=asset('a4_meat_'+grade);img.alt={raw:'生の肉',cooked:'焼けた肉',burnt:'焦げた肉'}[grade];}});
      const drop=(now()-dropAt)/1500;
      if(drop>=1){if(lane===dropLane){totals.hits++;session?.answer(false);feedback.textContent='タレが付いた！ 減点';stainUntil=now()+1000;}else{totals.dodges++;session?.answer(true);}dropAt=now();dropLane=Math.floor(rng()*3);}
      stain.hidden=now()>=stainUntil;
      sauce.style.left=`${dropLane*33.333+16.666}%`;sauce.style.top=`${Math.min(1,(now()-dropAt)/1500)*75}%`;
      timer.textContent=`残り${Math.ceil(remaining())}秒 · 焼けた肉${totals.cooked} · 焦げ${totals.burnt} · タレ${totals.hits} · よけた数${totals.dodges}`;
    }
    if(session)unwatch=session.onTick(update);else interval=setInterval(update,80);cancel.onclick=()=>{if(!dead){stop();onCancel();}};move(1);update();return stop;
  }
  return {gradeMeat,score,laneForRatio,mount};
});
