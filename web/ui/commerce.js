import {button,esc,icon,itemArt} from './helpers.js';
export function createCommerce(native=globalThis.Android){
 let value={native:!!native?.commerceState,testAds:true,noAds:false,price:'US$4.99',purchaseAvailable:false,purchaseStatus:'unavailable',rewardedReady:false,rewardedLoading:false,fullscreen:false,message:''};
 return {
  get state(){return value;},
  update(state){if(state&&typeof state==='object')value={...value,...state,pendingReward:state.pendingReward||null};return value;},
  refresh(){try{if(native?.commerceState)this.update(JSON.parse(native.commerceState()));}catch{}return value;},
  banner(allowed){try{native?.adContext?.(!!allowed);}catch{}},
  interstitial(){try{native?.interstitialBreak?.();}catch{}},
  rewarded(context){try{native?.requestReward?.(JSON.stringify(context));}catch{}},
  load(){try{native?.loadOptionalAd?.();}catch{}},
  acknowledge(id){try{native?.acknowledgeReward?.(id);}catch{}},
  purchase(){try{native?.purchaseRemoveAds?.();}catch{}},
  restore(){try{native?.restorePurchases?.();}catch{}}
 };
}
export function commerceView(state,game,inGame,panel=inGame?'supplies':'ads'){
 const owned=state.noAds,reason=game?.supportRewardReason(),native=state.native;
 const buying=['pending','confirming'].includes(state.purchaseStatus);
 const purchaseNote=owned?'Banner and interstitial ads are removed.':buying?'Payment confirmation pending.':!native?'Purchases are available in the Android app.':!state.purchaseAvailable?'Purchase available through Google Play.':'One-time purchase · linked to your Google Play account.';
 const reward=inGame&&game?`<div class="commerce-card reward-card"><div class="commerce-card-head"><span class="overline">OPTIONAL SUPPLY PACK</span><span class="tiny-badge">1 / DAY</span></div><div class="commerce-supplies">${['ration','water'].map(id=>`<span>${itemArt(game.content.items[id])}<b>1 × ${esc(game.content.items[id].name)}</b></span>`).join('')}</div><p class="dialog-note">${esc(reason||'Watch an optional ad to receive these supplies.')}</p>${button(state.rewardedReady?'Watch ad · claim pack':state.rewardedLoading?'Loading optional ad…':'Load optional ad',state.rewardedReady?'watch-reward':'load-reward',{},'secondary-button full-width',!native||!!reason||state.rewardedLoading)}<small class="commerce-footnote">${owned?'Optional rewarded ads remain your choice.':'No payment needed.'} Cancel before earning · no supplies granted.</small></div>`:'';
 const purchase=`<div class="commerce-card"><div class="commerce-card-head"><span>${icon('shield-check',24)}<b>Remove Ads</b></span><strong>${owned?'OWNED':esc(state.price)}</strong></div><p>Remove banner and interstitial ads permanently.</p>${button(owned?'Owned · thank you':buying?'Confirmation pending':'Remove Ads · '+esc(state.price),'purchase-remove-ads',{},'primary-button full-width',owned||buying||!native||!state.purchaseAvailable)}<p class="commerce-footnote">${esc(purchaseNote)}</p>${button('Restore purchase','restore-purchases',{},'text-button',!native)}</div>`;
 const tabs=inGame&&game?`<div class="commerce-tabs">${button('Supplies','commerce-panel',{panel:'supplies'},panel==='supplies'?'active':'')}${button('Remove Ads','commerce-panel',{panel:'ads'},panel==='ads'?'active':'')}</div>`:'';
 return `<span class="overline">YOUR JOURNEY</span><h2 id="dialog-title">A quieter wilderness.</h2>${tabs}${inGame&&game&&panel==='supplies'?reward:purchase}${state.message?`<p class="commerce-message" role="status">${esc(state.message)}</p>`:''}${state.testAds&&native?'<small class="commerce-test">Google demo ads · starts muted</small>':''}`;
}
