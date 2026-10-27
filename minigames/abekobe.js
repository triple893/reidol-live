(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else(root.ReidolGames ||= {}).abekobe=api;
})(globalThis,function(){
  'use strict';
  const hands=['グー','チョキ','パー'];
  const wordSets=[['いぬ','さかな','えんぴつ','こどもべや'],['あめ','たまご','みずうみ','さくらもち'],['かさ','りんご','ひこうき','かきごおり']];
  function instruction(elapsed, kind){const reverse=Math.floor(elapsed/10)%2===1;return {reverse,text:kind==='hand'?(reverse?'負けろ！':'勝て！'):(reverse?'短い言葉！':'長い言葉！')};}
  function question(index,rng=Math.random){return index%2===0?{kind:'hand',opponent:Math.floor(rng()*3),choices:[...hands]}:{kind:'word',choices:[...wordSets[Math.floor(rng()*wordSets.length)]]};}
  function expected(q,elapsed){const reverse=instruction(elapsed,q.kind).reverse;if(q.kind==='hand')return (q.opponent+(reverse?1:2))%3;const lengths=q.choices.map(s=>[...s].length);return lengths.indexOf(reverse?Math.min(...lengths):Math.max(...lengths));}
  function handSVG(label){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','hand-icon');svg.setAttribute('aria-hidden','true');
    const shapes={
      'グー':'M5 12V9a2 2 0 0 1 4 0V8a2 2 0 0 1 4 0 2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v5c0 5-3 8-7 8h-3c-3 0-6-3-7-6l-1-3c-1-3 2-4 3-2l2 3M9 9v4m4-5v5m4-4v4',
      'チョキ':'M8 13 5 4c-1-3 2-4 3-1l4 8 2-9c1-3 4-2 3 1l-2 10 3-2c3-1 4 2 2 4l-3 5c-2 3-8 3-10 0l-3-5c-2-3 1-5 3-2l2 2',
      'パー':'M5 12V6c0-3 3-3 3 0v5-8c0-3 3-3 3 0v8-9c0-3 3-3 3 0v9-7c0-3 3-3 3 0v10l2-3c2-2 4 0 2 3l-4 6c-2 3-8 3-10 0l-4-6c-2-3 1-5 3-2l2 3'};
    const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',shapes[label]);for(const [k,v] of Object.entries({fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'}))p.setAttribute(k,v);svg.appendChild(p);return svg;
  }
  function mount(container,{seconds=45,onFinish,onCancel,now=()=>performance.now(),rng=Math.random,session}){
    const start=now();let dead=false,correct=0,attempts=0,index=0,q=question(0,rng),nextAllowed=0,interval,unwatch=()=>{},reverse=false,nextFlip=10,lastFlip=0,flipLevel=1,warned=-1;
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    node('h2','あべこべ早打ち');node('p','じゃんけんと長さ比べ。勝て⇄負けろ、長い⇄短いが反転！').className='mini-rules';
    const timer=node('p',''),order=node('p',''),prompt=node('p',''),feedback=node('p',''),choices=node('div','');order.className='mini-instruction';choices.className='minichoices';feedback.setAttribute('role','status');
    timer.className='mini-local-timer';const cancel=node('button','やめて一覧へ');cancel.type='button';cancel.className='btn sec mini-cancel';
    const elapsed=()=>session?session.elapsed():Math.max(0,(now()-start)/1000),remaining=()=>session?session.remaining():Math.max(0,seconds-elapsed());
    const stop=()=>{if(dead)return;dead=true;clearInterval(interval);unwatch();delete container.dataset.flipWarning;};
    const finish=()=>{if(dead)return;stop();const stats={correct,attempts};if(session)session.end(stats);else onFinish(stats);};
    function update(){
      if(dead)return;const t=elapsed();if(remaining()<=0){finish();return;}
      const level=session?session.level():1,period=[10,8,6][level-1];let flipped=false;
      if(level!==flipLevel){flipLevel=level;nextFlip=lastFlip+period;warned=-1;}
      while(t>=nextFlip){lastFlip=nextFlip;reverse=!reverse;nextFlip+=period;warned=-1;flipped=true;}
      const warning=nextFlip-t<=2;container.dataset.flipWarning=String(warning);
      if(warning&&warned!==nextFlip){warned=nextFlip;session?.cue('mg_countdown');}
      order.textContent=q.kind==='hand'?(reverse?'負けろ！':'勝て！'):(reverse?'短い言葉！':'長い言葉！');order.className='mini-instruction'+(reverse?' reverse':'');
      if(flipped){void order.offsetWidth;order.classList.add('flipped');}
      timer.textContent=`残り${Math.ceil(remaining())}秒 · 正解${correct} / ${attempts}`;
    }
    function draw(){
      prompt.textContent='';prompt.className=q.kind==='hand'?'mini-opponent':'mini-word-prompt';
      if(q.kind==='hand'){prompt.append('相手の手',handSVG(hands[q.opponent]),hands[q.opponent]);}else prompt.textContent='指示どおりの長さを選ぼう';
      choices.className='minichoices '+(q.kind==='hand'?'hand-choices':'word-choices');choices.textContent='';
      q.choices.forEach((choice,i)=>{const b=node('button','',choices);b.type='button';if(q.kind==='hand')b.appendChild(handSVG(choice));node('span',choice,b);
        b.onclick=()=>{if(dead)return;update();if(dead)return;if(now()<nextAllowed)return;nextAllowed=now()+180;attempts++;
          const lengths=q.choices.map(s=>[...s].length),answer=q.kind==='hand'?(q.opponent+(reverse?1:2))%3:lengths.indexOf(reverse?Math.min(...lengths):Math.max(...lengths));
          const ok=i===answer;session?.answer(ok,{button:b});if(ok)correct++;feedback.textContent=ok?'正解！':'今の指示を見てみよう';q=question(++index,rng);draw();update();};});
    }
    if(session)unwatch=session.onTick(update);else interval=setInterval(update,100);cancel.onclick=()=>{if(dead)return;stop();onCancel();};draw();update();return stop;
  }
  return {instruction,question,expected,mount};
});
