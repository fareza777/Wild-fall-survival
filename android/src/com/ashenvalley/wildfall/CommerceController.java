package com.ashenvalley.wildfall;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import org.json.JSONObject;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/** Native-only purchases and real Google demo ads. The WebView cannot unlock ownership. */
final class CommerceController {
  interface Listener { void changed(); void fullscreen(boolean showing); }
  private final Activity activity;
  private final SharedPreferences preferences;
  private final LinearLayout bannerHost;
  private final Listener listener;
  private final BillingClient billing;
  private final String productId;
  private AdView banner;
  private InterstitialAd interstitial;
  private RewardedAd rewarded;
  private ProductDetails product;
  private boolean initialized, bannerAllowed, bannerReady, loadingInterstitial, loadingRewarded, showing, destroyed, connecting;
  private boolean noAds;
  private long interstitialLoadedAt, rewardedLoadedAt, lastInterstitial, lastBannerRequest, lastInterstitialRequest, lastRewardRequest;
  private String price, purchaseStatus="connecting", message="";

  CommerceController(Activity activity, SharedPreferences preferences, LinearLayout bannerHost, Listener listener) {
    this.activity=activity;this.preferences=preferences;this.bannerHost=bannerHost;this.listener=listener;
    noAds=preferences.getBoolean("remove-ads-owned",false);
    price=activity.getString(R.string.remove_ads_default_price);
    productId=activity.getString(R.string.remove_ads_product_id);
    billing=BillingClient.newBuilder(activity).setListener(this::purchasesUpdated)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection().build();
    connectBilling();
    MobileAds.setRequestConfiguration(new RequestConfiguration.Builder().setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build());
    new Thread(()->MobileAds.initialize(activity,status->activity.runOnUiThread(()->{
      if(destroyed)return;
      MobileAds.setAppMuted(true);MobileAds.setAppVolume(0f);
      initialized=true;Log.i("WildfallCommerce","AdMob ready; ad audio muted");loadAds();changed();
    })),"wildfall-ads-init").start();
  }
  JSONObject state() {
    JSONObject state=new JSONObject();
    try {
      state.put("native",true).put("testAds",true).put("noAds",noAds).put("bannerReady",bannerReady)
          .put("interstitialReady",interstitial!=null).put("rewardedReady",rewarded!=null)
          .put("rewardedLoading",loadingRewarded).put("fullscreen",showing)
          .put("purchaseAvailable",product!=null&&billing.isReady()).put("purchaseStatus",purchaseStatus)
          .put("price",price).put("message",message);
      String pending=preferences.getString("pending-ad-reward","");
      if(!pending.isEmpty())state.put("pendingReward",new JSONObject(pending));
    }catch(Exception ignored){}
    return state;
  }
  private void changed(){if(!destroyed)listener.changed();}
  private void say(String text){message=text;changed();}
  boolean showing(){return showing;}
  void setBannerAllowed(boolean allowed){
    bannerAllowed=allowed;
    if(allowed)loadBanner();
    updateBanner();
  }
  private void updateBanner(){
    boolean visible=bannerAllowed&&bannerReady&&!noAds&&!showing;
    bannerHost.setVisibility(visible?View.VISIBLE:View.GONE);
    if(banner!=null){if(visible)banner.resume();else banner.pause();}
  }
  private void loadBanner(){
    long now=SystemClock.elapsedRealtime();
    if(!initialized||noAds||!bannerAllowed||banner!=null||now-lastBannerRequest<30000&&lastBannerRequest!=0)return;
    lastBannerRequest=now;
    banner=new AdView(activity);
    int width=(int)(activity.getResources().getDisplayMetrics().widthPixels/activity.getResources().getDisplayMetrics().density);
    banner.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity,Math.max(240,width)));
    banner.setAdUnitId(activity.getString(R.string.admob_banner_id));
    banner.setAdListener(new AdListener(){
      @Override public void onAdLoaded(){Log.i("WildfallCommerce","Banner loaded");bannerReady=true;updateBanner();changed();}
      @Override public void onAdFailedToLoad(LoadAdError error){Log.i("WildfallCommerce","Banner unavailable: "+error.getCode());clearBanner();changed();}
    });
    TextView label=new TextView(activity);label.setText("ADVERTISEMENT · TEST");label.setTextSize(8);label.setTextColor(Color.rgb(150,145,142));label.setGravity(Gravity.CENTER);
    bannerHost.addView(label,new LinearLayout.LayoutParams(-1,-2));
    bannerHost.addView(banner,new LinearLayout.LayoutParams(-1,-2));
    banner.loadAd(new AdRequest.Builder().build());
  }
  private void clearBanner(){bannerReady=false;if(banner!=null){banner.destroy();banner=null;}bannerHost.removeAllViews();bannerHost.setVisibility(View.GONE);}
  void loadAds(){loadBanner();loadInterstitial();loadRewarded();}
  private void loadInterstitial(){
    long now=SystemClock.elapsedRealtime();
    if(!initialized||noAds||destroyed||loadingInterstitial||interstitial!=null||now-lastInterstitialRequest<30000&&lastInterstitialRequest!=0)return;
    loadingInterstitial=true;lastInterstitialRequest=now;
    InterstitialAd.load(activity,activity.getString(R.string.admob_interstitial_id),new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){
      @Override public void onAdLoaded(InterstitialAd ad){if(destroyed)return;Log.i("WildfallCommerce","Interstitial loaded");loadingInterstitial=false;interstitial=ad;interstitialLoadedAt=SystemClock.elapsedRealtime();changed();}
      @Override public void onAdFailedToLoad(LoadAdError error){Log.i("WildfallCommerce","Interstitial unavailable: "+error.getCode());loadingInterstitial=false;interstitial=null;changed();}
    });
  }
  private void loadRewarded(){
    long now=SystemClock.elapsedRealtime();
    if(!initialized||destroyed||loadingRewarded||rewarded!=null||now-lastRewardRequest<30000&&lastRewardRequest!=0)return;
    loadingRewarded=true;lastRewardRequest=now;
    RewardedAd.load(activity,activity.getString(R.string.admob_rewarded_id),new AdRequest.Builder().build(),new RewardedAdLoadCallback(){
      @Override public void onAdLoaded(RewardedAd ad){if(destroyed)return;Log.i("WildfallCommerce","Rewarded loaded");loadingRewarded=false;rewarded=ad;rewardedLoadedAt=SystemClock.elapsedRealtime();changed();}
      @Override public void onAdFailedToLoad(LoadAdError error){Log.i("WildfallCommerce","Rewarded unavailable: "+error.getCode());loadingRewarded=false;rewarded=null;say("Optional ad unavailable. You can keep playing.");}
    });
  }
  void interstitialBreak(){
    long now=SystemClock.elapsedRealtime();
    if(now-interstitialLoadedAt>=3600000){interstitial=null;loadInterstitial();return;}
    if(!CommerceRules.interstitial(noAds,showing,interstitial!=null,now,lastInterstitial,interstitialLoadedAt))return;
    InterstitialAd ad=interstitial;interstitial=null;ad.setFullScreenContentCallback(fullscreenCallback(false));lastInterstitial=now;ad.show(activity);
  }
  void rewarded(String context){
    if(showing)return;
    if(!preferences.getString("pending-ad-reward","").isEmpty()){say("Your earned supply pack is waiting.");return;}
    if(rewarded==null){loadRewarded();say("Optional ad unavailable. Try again later.");return;}
    if(SystemClock.elapsedRealtime()-rewardedLoadedAt>=3600000){rewarded=null;loadRewarded();say("Loading a fresh optional ad.");return;}
    final JSONObject payload;
    try {
      JSONObject input=new JSONObject(context);String run=input.getString("runId");int day=input.getInt("day");
      if(!run.matches("[a-z0-9_-]{1,120}")||day<1||day>100000)return;
      if(preferences.getInt("reward-day-"+run,0)>=day){say("Supply pack claimed. Return tomorrow.");return;}
      payload=new JSONObject().put("id",UUID.randomUUID().toString()).put("runId",run).put("day",day);
    }catch(Exception ignored){return;}
    RewardedAd ad=rewarded;rewarded=null;ad.setFullScreenContentCallback(fullscreenCallback(true));
    ad.show(activity,reward->{
      Log.i("WildfallCommerce","SDK reward earned");
      preferences.edit().putString("pending-ad-reward",payload.toString()).putInt("reward-day-"+payload.optString("runId"),payload.optInt("day")).commit();
      message="Supply pack earned.";
    });
  }
  private FullScreenContentCallback fullscreenCallback(boolean reward){return new FullScreenContentCallback(){
    @Override public void onAdShowedFullScreenContent(){Log.i("WildfallCommerce",reward?"Rewarded shown":"Interstitial shown");showing=true;updateBanner();listener.fullscreen(true);changed();}
    @Override public void onAdDismissedFullScreenContent(){finishAd();}
    @Override public void onAdFailedToShowFullScreenContent(AdError error){message="Ad unavailable. Your journey continues.";finishAd();}
    private void finishAd(){Log.i("WildfallCommerce","Fullscreen ad finished");showing=false;listener.fullscreen(false);updateBanner();changed();if(reward)loadRewarded();else loadInterstitial();}
  };}
  void acknowledgeReward(String id){
    try{JSONObject pending=new JSONObject(preferences.getString("pending-ad-reward",""));if(id.equals(pending.optString("id"))){preferences.edit().remove("pending-ad-reward").commit();changed();}}catch(Exception ignored){}
  }
  private void connectBilling(){
    if(destroyed||connecting||billing.isReady())return;connecting=true;
    billing.startConnection(new BillingClientStateListener(){
      @Override public void onBillingSetupFinished(BillingResult result){connecting=false;if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){purchaseStatus="checking";queryProduct();restore(false);}else{purchaseStatus="unavailable";changed();}}
      @Override public void onBillingServiceDisconnected(){connecting=false;purchaseStatus="unavailable";changed();}
    });
  }
  private void queryProduct(){
    QueryProductDetailsParams params=QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder().setProductId(productId).setProductType(BillingClient.ProductType.INAPP).build())).build();
    billing.queryProductDetailsAsync(params,(result,details)->activity.runOnUiThread(()->{
      if(destroyed)return;product=null;
      if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)for(ProductDetails candidate:details.getProductDetailsList())if(productId.equals(candidate.getProductId())&&candidate.getOneTimePurchaseOfferDetails()!=null){product=candidate;price=candidate.getOneTimePurchaseOfferDetails().getFormattedPrice();}
      purchaseStatus=product==null?"unavailable":"ready";changed();
    }));
  }
  void purchase(){
    if(noAds){say("Remove Ads is already owned.");return;}
    if(product==null||!billing.isReady()){connectBilling();say("Remove Ads is available through Google Play once the product is published.");return;}
    ProductDetails.OneTimePurchaseOfferDetails offer=product.getOneTimePurchaseOfferDetails();
    BillingFlowParams.ProductDetailsParams.Builder item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product);
    if(offer!=null&&offer.getOfferToken()!=null)item.setOfferToken(offer.getOfferToken());
    BillingResult result=billing.launchBillingFlow(activity,BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).build());
    if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)restore(true);else say("Purchase unavailable. No payment was completed.");}
  }
  void restore(boolean explicit){
    if(!billing.isReady()){connectBilling();if(explicit)say("Connect to Google Play to restore your purchase.");return;}
    billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,purchases)->activity.runOnUiThread(()->{
      if(destroyed||result.getResponseCode()!=BillingClient.BillingResponseCode.OK)return;
      boolean owns=false,pending=false;
      for(Purchase purchase:purchases)if(purchase.getProducts().contains(productId)){if(purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED){owns=true;processPurchase(purchase);}else if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING)pending=true;}
      if(!owns&&!pending)setOwned(false);
      if(explicit&&!owns)say(pending?"Payment pending.":"No Remove Ads purchase found for this Google Play account.");
    }));
  }
  private void purchasesUpdated(BillingResult result,List<Purchase> purchases){activity.runOnUiThread(()->{
    if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&purchases!=null){for(Purchase purchase:purchases)processPurchase(purchase);}
    else if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED)say("Purchase cancelled.");
    else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)restore(true);
    else say("Purchase unavailable. No payment was completed.");
  });}
  private void processPurchase(Purchase purchase){
    if(!purchase.getProducts().contains(productId))return;
    if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING){purchaseStatus="pending";say("Payment pending. Remove Ads unlocks after confirmation.");return;}
    try{if(!CommerceRules.purchase(purchase.getProducts(),productId,purchase.getPurchaseState(),purchase.getPurchaseToken(),new JSONObject(purchase.getOriginalJson()).optString("packageName"),activity.getPackageName()))return;}catch(Exception ignored){return;}
    if(purchase.isAcknowledged()){setOwned(true);say("Remove Ads restored.");return;}
    purchaseStatus="confirming";changed();
    billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),result->activity.runOnUiThread(()->{
      if(destroyed)return;
      if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){setOwned(true);say("Remove Ads unlocked. Thank you.");}
      else{purchaseStatus="confirming";say("Purchase confirmation pending. Reopen or restore to retry.");}
    }));
  }
  private void setOwned(boolean owned){
    noAds=owned;preferences.edit().putBoolean("remove-ads-owned",owned).apply();
    if(owned){purchaseStatus="owned";clearBanner();interstitial=null;}else{if(product!=null)purchaseStatus="ready";loadAds();}
    changed();
  }
  void pause(){if(banner!=null)banner.pause();}
  void resume(){if(!showing){updateBanner();if(billing.isReady())restore(false);else connectBilling();}}
  void destroy(){destroyed=true;clearBanner();billing.endConnection();rewarded=null;interstitial=null;}
}
