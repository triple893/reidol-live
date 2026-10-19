(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.ReidolGames||={}).balloon=api;})(globalThis,function(){
  'use strict';
  function makeQuestions({members,profiles,songs=[],venues}) {
    const bank=[];
    function add(id,text,answer,pool,source){
      const choices=[String(answer),...new Set(pool.map(String).filter(v=>String(v)!==String(answer)))].slice(0,3);
      if(choices.length===3)bank.push({id,text,choices,answer:0,source});
    }
    for(const m of members){const p=profiles[m.h];
      add('color:'+m.h,`${m.name}の担当カラーは？`,p.color,members.map(x=>profiles[x.h].color),`index.html PROFILES.${m.h}.color = ${p.color}`);
      add('home:'+m.h,`${m.name}の出身は？`,p.hometown,members.map(x=>profiles[x.h].hometown),`index.html PROFILES.${m.h}.hometown = ${p.hometown}`);
      add('month:'+m.h,`${m.name}の誕生日は何月？`,`${+p.bd.slice(0,2)}月`,members.map(x=>`${+profiles[x.h].bd.slice(0,2)}月`),`index.html PROFILES.${m.h}.bd = ${p.bd}`);
    }
    venues.slice(0,-1).forEach((v,i)=>add('venue:'+i,`${v.n}の次の会場は？`,venues[i+1].n,venues.map(x=>x.n),`index.html BALANCE.venues[${i+1}].n = ${venues[i+1].n}`));
    const list=songs.filter(s=>typeof s.title==='string'&&Number.isFinite(s.bpm)&&s.bpm>0).slice().sort((a,b)=>a.bpm-b.bpm);
    for(let i=0;i+2<list.length;i++){
      const triple=list.slice(i,i+3),top=triple[2];if(top.bpm===triple[1].bpm)continue;
      add('bpm:'+top.slug,'この3曲でBPMが一番大きい曲は？',top.title,triple.map(s=>s.title),triple.map(s=>`charts/index.json ${s.slug}.bpm = ${s.bpm}`).join(' / '));
    }
    return bank;
  }
  function shuffleQuestion(q,rng=Math.random){
    const choices=q.choices.map((text,i)=>({text,correct:i===q.answer}));
    for(let i=choices.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[choices[i],choices[j]]=[choices[j],choices[i]];}
    return {...q,choices:choices.map(c=>c.text),answer:choices.findIndex(c=>c.correct)};
  }
  const grade=(question,index)=>Number.isInteger(index)&&index===question.answer;
  function score(correct,attempts){const n=Math.max(0,Math.floor(Number(attempts)||0));return {correct:Math.max(0,Math.min(n,Math.floor(Number(correct)||0))),attempts:n};}
  function mount(container,{questions,seconds=45,roundSeconds=5,onFinish,onCancel,asset,now=()=>performance.now(),rng=Math.random}){
    if(!questions?.length)throw new Error('クイズの確認済みデータがありません');
    const start=now();let born=start,dead=false,correct=0,attempts=0,index=0,q,lastStage=-1;
    const node=(tag,text,parent=container)=>{const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el;};
    container.classList.add('wave2-game');node('h2','風船クイズ');node('p','風船が割れる前に3択で答えよう。間違えると風船は膨らみ続けます。');
    const timer=node('p',''),scene=node('div','');scene.className='w2-quiz';
    const image=node('img','',scene);image.alt='膨らむ風船';image.className='w2-balloon';
    const question=node('p','',scene),feedback=node('p','');feedback.setAttribute('role','status');
    const choices=node('div','');choices.className='minichoices';const cancel=node('button','やめて一覧へ');cancel.className='btn sec';cancel.type='button';
    function stop(){dead=true;clearInterval(interval);container.classList.remove('wave2-game');}
    function next(){q=shuffleQuestion(questions[index++%questions.length],rng);born=now();lastStage=-1;question.textContent=q.text;choices.textContent='';q.choices.forEach((text,i)=>{const b=node('button',text,choices);b.type='button';b.onclick=()=>{if(dead)return;if(now()-start>=seconds*1000){finish();return;}attempts++;if(grade(q,i)){correct++;feedback.textContent='正解！';next();}else feedback.textContent='もう一度、確認してみよう';};});}
    function finish(){if(dead)return;stop();onFinish(score(correct,attempts));}
    function update(){if(dead)return;const t=(now()-start)/1000;if(t>=seconds){finish();return;}if(now()-born>=roundSeconds*1000){attempts++;feedback.textContent='風船が割れた！ 次の問題へ';next();}const stage=Math.min(2,Math.floor((now()-born)/(roundSeconds*1000)*3));if(stage!==lastStage){lastStage=stage;image.src=asset('a2_balloon_'+['small','medium','large'][stage]);}timer.textContent=`残り${Math.ceil(seconds-t)}秒 · 正解${correct} / ${attempts}`;}
    const interval=setInterval(update,100);cancel.onclick=()=>{if(!dead){stop();onCancel();}};next();update();return stop;
  }
  return {makeQuestions,shuffleQuestion,grade,score,mount};
});
