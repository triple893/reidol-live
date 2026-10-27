(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.ReidolGames ||= {}).shiritori = api;
})(globalThis, function() {
  'use strict';
  const last = word => ({'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','ゃ':'や','ゅ':'ゆ','ょ':'よ','っ':'つ'}[word.slice(-1)] || word.slice(-1));
  function prepare(words) {
    const pool = {};
    for (let size = 2; size <= 8; size++) {
      const list = words && words[size];
      if (!Array.isArray(list) || list.length < 4 || new Set(list).size !== list.length || list.some(w => typeof w !== 'string' || [...w].length !== size || !/^[ぁ-ゖ]+$/.test(w))) throw new Error(`${size}文字の単語リストが不正です`);
      pool[size] = [...list];
    }
    const viable = {8:pool[8].filter(w => !['ん','ー'].includes(last(w)))};
    for (;;) { const next = viable[8].filter(w => viable[8].some(n => n[0] === last(w))); if (next.length === viable[8].length) break; viable[8] = next; }
    for (let size = 7; size >= 2; size--) viable[size] = pool[size].filter(w => !['ん','ー'].includes(last(w)) && viable[size+1].some(n => n[0] === last(w)));
    if (!viable[2].length) throw new Error('最後までつながる単語がありません');
    for (let size = 2; size <= 8; size++) for (const word of viable[size]) if (pool[size].filter(w => w[0] !== word[0]).length < 3) throw new Error('4択を作る単語が足りません');
    return {pool, viable};
  }
  function shuffled(list, rng) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function question(data, state, rng = Math.random, choiceCount = 4) {
    const size = state.word ? Math.min(8, state.size + 1) : 2;
    const candidates = data.viable[size].filter(w => !state.word || w[0] === last(state.word));
    if (!candidates.length) throw new Error('つながる単語がありません');
    const answer = candidates[Math.floor(rng()*candidates.length)], head = answer[0];
    const wrong = shuffled(data.pool[size].filter(w => w[0] !== head), rng).slice(0,choiceCount-1);
    return { size, head, answer, choices:shuffled([answer,...wrong],rng) };
  }
  function mount(container, {words, seconds=60, onFinish, onCancel, now=()=>performance.now(), rng=Math.random, session}) {
    const data=prepare(words), start=now(); let dead=false, correct=0, attempts=0, state={word:'',size:1}, current, nextAllowed=0,born=now(),lastLevel=1,interval,unwatch=()=>{};
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    node('h2','限界しりとりパズル'); node('p','最後の文字から始まる言葉を選ぼう。2→3→…→8文字。8文字でつなぎ続けます。').className='mini-rules';
    const timer=node('p',''), instruction=node('p',''), feedback=node('p',''), choices=node('div',''); instruction.className='mini-instruction';feedback.setAttribute('role','status');choices.className='minichoices';
    timer.className='mini-local-timer';const cancel=node('button','やめて一覧へ'); cancel.type='button';cancel.className='btn sec mini-cancel';
    const stop=()=>{if(dead)return;dead=true;clearInterval(interval);unwatch();};
    const finish=()=>{if(dead)return;stop();const stats={correct,attempts};if(session)session.end(stats);else onFinish(stats);};
    const level=()=>session?session.level():1;
    function remaining(){return session?session.remaining():Math.max(0,seconds-(now()-start)/1000);}
    function draw(){born=now();current=question(data,state,rng,[4,5,6][level()-1]);instruction.textContent=`${state.word ? '前の言葉「'+state.word+'」' : 'はじめの文字「'+current.head+'」'} → ${current.size}文字・「${current.head}」から`;choices.textContent='';choices.style.gridTemplateColumns=level()===1?'repeat(4,minmax(0,1fr))':'repeat(3,minmax(0,1fr))';for(const word of current.choices){const b=node('button',word,choices);b.type='button';b.onclick=()=>{if(dead)return;if(remaining()<=0){finish();return;}if(now()<nextAllowed)return;nextAllowed=now()+180;attempts++;const ok=word===current.answer;session?.answer(ok,{button:b});if(ok){correct++;if(session&&session.combo()>=2)session.extend(.4);state={word,size:current.size};feedback.textContent='正解！';}else feedback.textContent='もう一度、頭の文字を見てみよう';draw();};}}
    function tick(){if(dead)return;const left=remaining();if(left<=0){finish();return;}if(lastLevel!==level()){lastLevel=level();draw();}const limit=session?[12,9,6][level()-1]:Infinity;if((now()-born)/1000>=limit){attempts++;session?.answer(false);feedback.textContent='時間切れ。次の言葉へ';draw();}timer.textContent=`残り ${Math.ceil(left)}秒 · 正解${correct} / ${attempts}`;}
    if(session)unwatch=session.onTick(tick);else interval=setInterval(tick,100);cancel.onclick=()=>{if(dead)return;stop();onCancel();};draw();tick();return stop;
  }
  return {last,prepare,question,mount};
});
