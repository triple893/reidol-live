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
  function mount(container,{seconds=45,onFinish,onCancel,now=()=>performance.now(),rng=Math.random}){
    const start=now();let dead=false,correct=0,attempts=0,index=0,q=question(0,rng),nextAllowed=0;
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    node('h2','あべこべ早打ち');node('p','じゃんけんと長さ比べが交互に出ます。10秒ごとに勝て⇄負けろ、長い⇄短いが反転！');
    const timer=node('p',''),order=node('p',''),prompt=node('p',''),feedback=node('p',''),choices=node('div','');order.className='mini-instruction';choices.className='minichoices';feedback.setAttribute('role','status');
    const cancel=node('button','やめて一覧へ');cancel.type='button';cancel.className='btn sec';
    const elapsed=()=>Math.max(0,(now()-start)/1000),stop=()=>{dead=true;clearInterval(interval);};
    const finish=()=>{if(dead)return;stop();onFinish({correct,attempts});};
    function update(){const t=elapsed();if(t>=seconds){finish();return;}const rule=instruction(t,q.kind);order.textContent=rule.text;order.className='mini-instruction'+(rule.reverse?' reverse':'');timer.textContent=`残り${Math.ceil(seconds-t)}秒 · 正解${correct} / ${attempts}`;}
    function draw(){prompt.textContent=q.kind==='hand'?`相手は「${hands[q.opponent]}」`:'指示どおりの長さを選ぼう';choices.textContent='';q.choices.forEach((choice,i)=>{const b=node('button',choice,choices);b.type='button';b.onclick=()=>{if(dead)return;const t=elapsed();if(t>=seconds){finish();return;}if(now()<nextAllowed)return;nextAllowed=now()+180;attempts++;if(i===expected(q,t)){correct++;feedback.textContent='正解！';}else feedback.textContent='今の指示を見てみよう';q=question(++index,rng);draw();update();};});}
    const interval=setInterval(update,100);cancel.onclick=()=>{if(dead)return;stop();onCancel();};draw();update();return stop;
  }
  return {instruction,question,expected,mount};
});
