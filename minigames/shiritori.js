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
  function preparePremium(raw, words) {
    if (!raw || !Array.isArray(raw.words) || !raw.words.length) throw new Error('原作キーワードがありません');
    const rows=raw.words, merged=Object.fromEntries(Object.entries(words).map(([k,v])=>[k,[...v]])), deck=[];
    const labels=new Map();let previous=null;
    for(const row of rows){
      if(!row || typeof row.text!=='string' || !/^[ぁ-ゖ]+$/.test(row.reading) || !/^https:\/\/youtube\.com\/shorts\/[\w-]+$/.test(row.source))throw new Error('原作キーワードの形式が不正です');
      const size=[...row.reading].length;labels.set(row.reading,row.text);
      if(size===1||size>8){previous=null;continue;}
      if(!merged[size].includes(row.reading))merged[size].push(row.reading);
      if(['ん','ー'].includes(last(row.reading))){previous=null;continue;}
      // 動画の並びを捏造しない。2文字の開始語と、実際につながる続きだけ固定出題する。
      const reset=size===2;
      if(reset || previous && size===previous.size+1 && row.reading[0]===last(previous.reading)){
        deck.push({...row,size,reset});previous={...row,size};
      }else previous=null;
    }
    if(!deck.length)throw new Error('2文字から始まる原作キーワードがありません');
    return {data:prepare(merged),rows,labels,deck};
  }
  function premiumQuestion(premium,index,state,rng=Math.random,choiceCount=4){
    const entry=premium.deck[index];let q;
    if(entry){
      const wrong=shuffled(premium.data.pool[entry.size].filter(w=>w[0]!==entry.reading[0]),rng).slice(0,choiceCount-1);
      q={size:entry.size,head:entry.reading[0],answer:entry.reading,choices:shuffled([entry.reading,...wrong],rng),reset:entry.reset};
    }else{
      const size=state.word?Math.min(8,state.size+1):2,connects=premium.data.viable[size].some(w=>!state.word||w[0]===last(state.word));
      q=question(premium.data,connects?state:{word:'',size:1},rng,choiceCount);q.reset=!connects;
    }
    // 同字数の原作語は誤答候補にも優先表示（末尾んの語もつながる正解とは扱わない）。
    const reserved=premium.rows.filter(r=>[...r.reading].length===q.size&&r.reading[0]!==q.head).map(r=>r.reading);
    if(reserved.length){const wrong=[...new Set([...reserved,...q.choices.filter(w=>w!==q.answer)])].slice(0,choiceCount-1);q.choices=shuffled([q.answer,...wrong],rng);}
    return {...q,premium:premium.labels.has(q.answer)};
  }
  function mount(container, {words, premiumWords, seconds=30, onFinish, onCancel, now=()=>performance.now(), rng=Math.random, session}) {
    const premium=preparePremium(premiumWords,words),data=premium.data,start=now(); let dead=false, correct=0, attempts=0, state={word:'',size:1}, current, premiumIndex=0,nextAllowed=0,born=now(),lastLevel=1,interval,unwatch=()=>{};
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    node('h2','限界しりとりパズル'); node('p','最後の文字から始まる言葉を選ぼう。2→3→…→8文字。原作の次の組では2文字から再開。').className='mini-rules';
    const ribbon=node('div','');ribbon.className='premium-ribbon';ribbon.setAttribute('aria-label','原作プレミアムキーワード');
    for(const row of premium.rows){const chip=node('span',row.text,ribbon);chip.title=row.reading;chip.dataset.reading=row.reading;}
    const timer=node('p',''), instruction=node('p',''), feedback=node('p',''), choices=node('div',''); instruction.className='mini-instruction';feedback.setAttribute('role','status');choices.className='minichoices';
    timer.className='mini-local-timer';choices.classList.add('word-choices');const cancel=node('button','やめて一覧へ'); cancel.type='button';cancel.className='btn sec mini-cancel';
    const stop=()=>{if(dead)return;dead=true;clearInterval(interval);unwatch();};
    const finish=()=>{if(dead)return;stop();const stats={correct,attempts};if(session)session.end(stats);else onFinish(stats);};
    const level=()=>session?session.level():1;
    function remaining(){return session?session.remaining():Math.max(0,seconds-(now()-start)/1000);}
    function draw(){born=now();current=premiumQuestion(premium,premiumIndex,state,rng,[4,5,6][level()-1]);
      const previous=current.reset?'原作の開始文字「'+current.head+'」':state.word?'前の言葉「'+(premium.labels.get(state.word)||state.word)+'」':'はじめの文字「'+current.head+'」';
      instruction.textContent=`${previous} → ${current.size}文字・「${current.head}」から`;
      ribbon.querySelectorAll('span').forEach(e=>e.classList.toggle('current',e.dataset.reading===current.answer));
      choices.textContent='';choices.style.gridTemplateColumns=level()===1?'repeat(4,minmax(0,1fr))':'repeat(3,minmax(0,1fr))';
      for(const word of current.choices){const b=node('button',premium.labels.get(word)||word,choices);b.type='button';b.dataset.reading=word;
        if(premium.labels.has(word)){b.classList.add('premium-choice');b.setAttribute('aria-label',b.textContent+'（'+word+'）原作キーワード');const reading=node('small',word,b);reading.className='premium-reading';}
        b.onclick=()=>{if(dead)return;if(remaining()<=0){finish();return;}if(now()<nextAllowed)return;nextAllowed=now()+180;attempts++;const ok=word===current.answer;session?.answer(ok,{button:b,premium:current.premium});
          if(ok){correct++;if(session&&session.combo()>=2)session.extend(.4);state={word,size:current.size};if(premiumIndex<premium.deck.length)premiumIndex++;feedback.textContent='';}else feedback.textContent='もう一度、頭の文字を見てみよう';draw();};}}
    function tick(){if(dead)return;const left=remaining();if(left<=0){finish();return;}if(lastLevel!==level()){lastLevel=level();draw();}const limit=session?[12,9,6][level()-1]:Infinity;if((now()-born)/1000>=limit){attempts++;session?.answer(false);feedback.textContent='時間切れ。次の言葉へ';draw();}timer.textContent=`残り ${Math.ceil(left)}秒 · 正解${correct} / ${attempts}`;}
    if(session)unwatch=session.onTick(tick);else interval=setInterval(tick,100);cancel.onclick=()=>{if(dead)return;stop();onCancel();};draw();tick();return stop;
  }
  return {last,prepare,question,preparePremium,premiumQuestion,mount};
});
