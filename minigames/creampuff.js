(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.ReidolGames||={}).creampuff=api;})(globalThis,function(){
  'use strict';
  function makeRound(handles,rng=Math.random){
    const pool=[...new Set(handles)];if(pool.length<3)throw new Error('3人以上のメンバーが必要です');
    for(let i=pool.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(rng()*(i+1))));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return {members:pool.slice(0,3),answer:Math.max(0,Math.min(2,Math.floor(rng()*3)))};
  }
  const grade=(round,index)=>Number.isInteger(index)&&index===round.answer;
  function score(correct,attempts){const n=Math.max(0,Math.floor(Number(attempts)||0));return {correct:Math.max(0,Math.min(n,Math.floor(Number(correct)||0))),attempts:n};}
  function mount(container,{members,seconds=60,onFinish,onCancel,asset,now=()=>performance.now(),rng=Math.random}){
    const start=now();let dead=false,correct=0,attempts=0,round,nextAllowed=0;
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    container.classList.add('wave2-game');node('h2','激辛シュークリーム人狼');node('p','3人の表情を見比べて、我慢している1人を選ぼう。');
    const timer=node('p',''),puff=node('img','');puff.src=asset('a3_cream_puff');puff.alt='シュークリーム';puff.className='w2-puff';
    const choices=node('div','');choices.className='w2-faces minichoices';const feedback=node('p','');feedback.setAttribute('role','status');
    const cancel=node('button','やめて一覧へ');cancel.className='btn sec';cancel.type='button';
    function stop(){dead=true;clearInterval(interval);container.classList.remove('wave2-game');}
    function finish(){if(dead)return;stop();onFinish(score(correct,attempts));}
    function draw(){round=makeRound(members.map(m=>m.h),rng);choices.textContent='';round.members.forEach((h,i)=>{const m=members.find(m=>m.h===h),b=node('button','',choices);b.type='button';const img=node('img','',b);img.alt=m.name;img.src=i===round.answer?asset(`a3_${h}_endure`):`assets/${h}_face.jpg`;node('span',m.name,b);b.onclick=()=>{if(dead||now()<nextAllowed)return;if(now()-start>=seconds*1000){finish();return;}nextAllowed=now()+350;attempts++;const ok=grade(round,i);if(ok)correct++;feedback.textContent=ok?'正解！':'表情の違いを見てみよう';draw();};});}
    function update(){if(dead)return;const t=(now()-start)/1000;if(t>=seconds){finish();return;}timer.textContent=`残り${Math.ceil(seconds-t)}秒 · 正解${correct} / ${attempts}`;}
    const interval=setInterval(update,100);cancel.onclick=()=>{if(!dead){stop();onCancel();}};draw();update();return stop;
  }
  return {makeRound,grade,score,mount};
});
