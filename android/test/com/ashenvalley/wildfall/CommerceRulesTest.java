package com.ashenvalley.wildfall;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Collections;

public class CommerceRulesTest {
  @Test public void firstAdNeedsReadyContentAndNeverAppearsForOwnedOrBusyGame(){
    assertTrue(CommerceRules.interstitial(false,false,true,20000,0,10000));
    assertFalse(CommerceRules.interstitial(true,false,true,20000,0,10000));
    assertFalse(CommerceRules.interstitial(false,true,true,20000,0,10000));
    assertFalse(CommerceRules.interstitial(false,false,false,20000,0,10000));
  }
  @Test public void cooldownAndOneHourExpiryHaveExactBoundaries(){
    assertFalse(CommerceRules.interstitial(false,false,true,189999,10000,10000));
    assertTrue(CommerceRules.interstitial(false,false,true,190000,10000,10000));
    assertFalse(CommerceRules.interstitial(false,false,true,3610000,0,10000));
  }
  @Test public void confirmedMatchingPurchaseIsEligibleForAcknowledgement(){
    assertTrue(CommerceRules.purchase(Collections.singletonList("wildfall_remove_ads"),"wildfall_remove_ads",1,"token","com.ashenvalley.wildfall","com.ashenvalley.wildfall"));
  }
  @Test public void pendingCancelledWrongProductAndMissingTokenNeverUnlock(){
    for(int state:new int[]{0,2})assertFalse(CommerceRules.purchase(Collections.singletonList("wildfall_remove_ads"),"wildfall_remove_ads",state,"token","com.ashenvalley.wildfall","com.ashenvalley.wildfall"));
    assertFalse(CommerceRules.purchase(Collections.singletonList("another_product"),"wildfall_remove_ads",1,"token","com.ashenvalley.wildfall","com.ashenvalley.wildfall"));
    assertFalse(CommerceRules.purchase(Collections.singletonList("wildfall_remove_ads"),"wildfall_remove_ads",1,"","com.ashenvalley.wildfall","com.ashenvalley.wildfall"));
    assertFalse(CommerceRules.purchase(Collections.singletonList("wildfall_remove_ads"),"wildfall_remove_ads",1,"token","another.package","com.ashenvalley.wildfall"));
  }
}
