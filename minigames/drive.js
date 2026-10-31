(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.ReidolGames||={}).drive=api;})(globalThis,function(){
  'use strict';
  // このゲームだけの架空価格。実在店舗・商標・実在価格表を参照しない。
  const MENU=[{id:'burger',name:'まんまるバーガー',price:320},{id:'fries',name:'ほくほくポテト',price:180},{id:'shake',name:'ふわりシェイク',price:220},{id:'sundae',name:'星空サンデー',price:260},{id:'nuggets',name:'ひとくちナゲット',price:240}];
  const PLANS=[[1,1,1,0,0],[1,0,0,1,1],[0,1,1,1,0],[2,1,1,0,0],[0,2,0,1,1],[1,1,1,1,1],[2,2,0,0,0],[4,4,0,0,0]];
  const quantity=n=>Number.isInteger(n)&&n>=0&&n<=20?n:0;
  function total(counts,menu=MENU){return menu.reduce((sum,item,i)=>sum+item.price*quantity(counts[i]),0);}
  const targets=()=>PLANS.map((solution,id)=>({id,target:total(solution),solution:solution.slice()}));
  const exact=(counts,target)=>Number.isFinite(target)&&target>0&&total(counts)===target;
  function score(correct,attempts){const n=Math.max(0,Math.floor(Number(attempts)||0));return {correct:Math.max(0,Math.min(n,Math.floor(Number(correct)||0))),attempts:n};}
  function mount(container,{seconds=60,onFinish,onCancel,asset,now=()=>performance.now(),rng=Math.random,session}){
    const start=now(),allOrders=targets().sort((a,b)=>a.target-b.target),ordersForLevel=level=>allOrders.slice(...[[0,3],[3,6],[6,8]][level-1]);
    let lastLevel=session?session.level():1,orders=session?ordersForLevel(lastLevel):targets(),dead=false,index=Math.min(orders.length-1,Math.floor(rng()*orders.length)),counts=MENU.map(()=>0),correct=0,attempts=0,questionStart=now(),interval,unwatch=()=>{};
    const remaining=()=>session?session.remaining():Math.max(0,seconds-(now()-start)/1000);
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    container.classList.add('wave2-game');node('h2','ドライブスルー注文');node('p','架空のお店の暗算パズル。メニューを足して目標ぴったりにしよう。同じ品を複数選べます。').className='mini-rules';
    const timer=node('p',''),scene=node('div','');scene.className='w2-drive';scene.style.backgroundImage=`url("${asset('a6_drive_thru_bg')}")`;
    const target=node('p','',scene),sum=node('p','',scene),choices=node('div','',scene);choices.className='w2-menu';const labels=[];
    MENU.forEach((item,i)=>{const box=node('div','',choices),b=node('button','',box);b.type='button';const image=node('img','',b);image.src=asset('a6_menu_'+item.id);image.alt=item.name;node('span',`${item.name} ${item.price}円`,b);labels[i]=node('span','0個',box);const less=node('button','1個もどす',box);less.type='button';less.className='quit';less.setAttribute('aria-label',item.name+'を1個もどす');b.onclick=()=>{if(dead)return;counts[i]=Math.min(20,counts[i]+1);draw();};less.onclick=()=>{if(!dead){counts[i]=Math.max(0,counts[i]-1);draw();}};});
    timer.className='mini-local-timer';labels.forEach(label=>label.className='mini-quantity');const feedback=node('p','');feedback.setAttribute('role','status');const controls=node('div','');controls.className='ux-actions';const submit=node('button','この金額で注文',controls),reset=node('button','全部もどす',controls),cancel=node('button','やめて一覧へ',controls);for(const b of [submit,reset,cancel]){b.type='button';b.className='btn sec';}cancel.classList.add('mini-cancel');
    function draw(){target.textContent=`目標 ${orders[index%orders.length].target.toLocaleString('ja-JP')}円`;sum.textContent=`いま ${total(counts).toLocaleString('ja-JP')}円`;labels.forEach((label,i)=>label.textContent=counts[i]+'個');
      const amount=total(counts),goal=orders[index%orders.length].target,over=amount>goal;
      scene.style.setProperty('--order-near',Math.min(1,amount/goal));
      if(over&&scene.dataset.totalState!=='over'){sum.classList.remove('order-over');void sum.offsetWidth;sum.classList.add('order-over');}
      scene.dataset.totalState=over?'over':amount===goal?'exact':'under';sum.dataset.warning=over?'買いすぎ！':'';
    }
    function stop(){if(dead)return;dead=true;clearInterval(interval);unwatch();container.classList.remove('wave2-game');}
    function finish(){if(dead)return;stop();const stats=score(correct,attempts);if(session)session.end(stats);else onFinish(stats);}
    submit.onclick=()=>{if(dead)return;if(remaining()<=0){finish();return;}attempts++;const ok=exact(counts,orders[index%orders.length].target);if(ok){correct++;const elapsed=Math.max(0,(now()-questionStart)/1000),points=Math.max(1,1.5-elapsed/20);session?.answer(true,{points,button:submit,special:elapsed<=2});index++;counts=MENU.map(()=>0);questionStart=now();feedback.textContent='ぴったり！ 次の注文へ';}else{session?.answer(false,{button:submit});feedback.textContent='金額を確かめてみよう';}draw();};
    reset.onclick=()=>{if(!dead){counts=MENU.map(()=>0);draw();}};cancel.onclick=()=>{if(!dead){stop();onCancel();}};
    function update(){if(dead)return;if(remaining()<=0){finish();return;}const level=session?session.level():1;if(level!==lastLevel){lastLevel=level;orders=ordersForLevel(level);index=Math.min(index,orders.length-1);counts=MENU.map(()=>0);questionStart=now();feedback.textContent='目標金額が上がったよ';draw();}timer.textContent=`残り${Math.ceil(remaining())}秒 · 正解${correct} / ${attempts}`;}
    if(session)unwatch=session.onTick(update);else interval=setInterval(update,100);draw();update();return stop;
  }
  return {MENU,PLANS,total,targets,exact,score,mount};
});
