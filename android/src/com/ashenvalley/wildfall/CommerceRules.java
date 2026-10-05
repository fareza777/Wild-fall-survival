package com.ashenvalley.wildfall;
import java.util.List;
final class CommerceRules {
  static boolean interstitial(boolean owned,boolean showing,boolean ready,long now,long last,long loaded){
    return !owned&&!showing&&ready&&(last==0||now-last>=180000)&&now-loaded<3600000;
  }
  static boolean purchase(List<String> products,String product,int state,String token,String actualPackage,String expectedPackage){
    return products!=null&&products.contains(product)&&state==1&&token!=null&&!token.isEmpty()&&expectedPackage.equals(actualPackage);
  }
}
