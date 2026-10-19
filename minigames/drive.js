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
  function mount(container,{seconds=60,onFinish,onCancel,asset,now=()=>performance.now(),rng=Math.random}){
    const start=now(),orders=targets();let dead=false,index=Math.min(orders.length-1,Math.floor(rng()*orders.length)),counts=MENU.map(()=>0),correct=0,attempts=0;
    const node=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.appendChild(e);return e;};
    container.classList.add('wave2-game');node('h2','ドライブスルー注文');node('p','架空のお店の暗算パズル。メニューを足して目標ぴったりにしよう。同じ品を複数選べます。');
    const timer=node('p',''),scene=node('div','');scene.className='w2-drive';scene.style.backgroundImage=`url("${asset('a6_drive_thru_bg')}")`;
    const target=node('p','',scene),sum=node('p','',scene),choices=node('div','',scene);choices.className='w2-menu';const labels=[];
    MENU.forEach((item,i)=>{const box=node('div','',choices),b=node('button','',box);b.type='button';const image=node('img','',b);image.src=asset('a6_menu_'+item.id);image.alt=item.name;node('span',`${item.name} ${item.price}円`,b);labels[i]=node('span','0個',box);const less=node('button','1個もどす',box);less.type='button';less.className='quit';less.setAttribute('aria-label',item.name+'を1個もどす');b.onclick=()=>{if(dead)return;counts[i]=Math.min(20,counts[i]+1);draw();};less.onclick=()=>{if(!dead){counts[i]=Math.max(0,counts[i]-1);draw();}};});
    const feedback=node('p','');feedback.setAttribute('role','status');const controls=node('div','');controls.className='ux-actions';const submit=node('button','この金額で注文',controls),reset=node('button','全部もどす',controls),cancel=node('button','やめて一覧へ',controls);for(const b of [submit,reset,cancel]){b.type='button';b.className='btn sec';}
    function draw(){target.textContent=`目標 ${orders[index%orders.length].target.toLocaleString('ja-JP')}円`;sum.textContent=`いま ${total(counts).toLocaleString('ja-JP')}円`;labels.forEach((label,i)=>label.textContent=counts[i]+'個');}
    function stop(){dead=true;clearInterval(interval);container.classList.remove('wave2-game');}
    function finish(){if(dead)return;stop();onFinish(score(correct,attempts));}
    submit.onclick=()=>{if(dead)return;if(now()-start>=seconds*1000){finish();return;}attempts++;if(exact(counts,orders[index%orders.length].target)){correct++;index++;counts=MENU.map(()=>0);feedback.textContent='ぴったり！ 次の注文へ';}else feedback.textContent='金額を確かめてみよう';draw();};
    reset.onclick=()=>{if(!dead){counts=MENU.map(()=>0);draw();}};cancel.onclick=()=>{if(!dead){stop();onCancel();}};
    function update(){const t=(now()-start)/1000;if(t>=seconds){finish();return;}timer.textContent=`残り${Math.ceil(seconds-t)}秒 · 正解${correct} / ${attempts}`;}
    const interval=setInterval(update,100);draw();update();return stop;
  }
  return {MENU,PLANS,total,targets,exact,score,mount};
});
