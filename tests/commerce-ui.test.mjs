import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerce,commerceView} from '../web/ui/commerce.js';

test('native reward acknowledgements clear the old pending callback',()=>{
 const commerce=createCommerce({commerceState:()=>JSON.stringify({native:true,pendingReward:{id:'earned'}})});
 assert.equal(commerce.refresh().pendingReward.id,'earned');
 commerce.update({native:true,noAds:false});
 assert.equal(commerce.state.pendingReward,null);
});
test('a browser cannot purchase Remove Ads or generate a native reward',()=>{
 const commerce=createCommerce(null);
 const before=structuredClone(commerce.state);
 commerce.purchase();commerce.rewarded({runId:'run',day:1});
 assert.deepEqual(commerce.state,before);
 const markup=commerceView(commerce.state,null,false);
 assert.match(markup,/US\$4\.99/);
 assert.match(markup,/Purchases are available in the Android app/);
 assert.match(markup,/data-ui="purchase-remove-ads"[^>]*disabled/);
});
test('unconfirmed and unavailable purchases never look owned',()=>{
 for(const status of ['pending','confirming','unavailable']){
  const markup=commerceView({native:true,testAds:true,noAds:false,price:'US$4.99',purchaseStatus:status,purchaseAvailable:false},null,false);
  assert.doesNotMatch(markup,/Owned · thank you/);
  assert.match(markup,/data-ui="purchase-remove-ads"[^>]*disabled/);
 }
});
test('Remove Ads retains explicitly optional rewarded supplies',()=>{
 const game={supportRewardReason:()=>null,content:{items:{ration:{name:'Travel ration',art:'ration.webp'},water:{name:'Safe water',art:'water.webp'}}}};
 const markup=commerceView({native:true,noAds:true,price:'US$4.99',rewardedReady:true},game,true);
 assert.match(commerceView({native:true,noAds:true},game,true,'ads'),/OWNED/);assert.match(markup,/Optional rewarded ads remain your choice/);
 assert.match(markup,/data-ui="watch-reward"/);assert.doesNotMatch(markup,/data-ui="watch-reward"[^>]*disabled/);
});
