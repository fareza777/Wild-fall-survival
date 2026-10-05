package com.ashenvalley.wildfall.qa;

import com.android.uiautomator.core.Configurator;
import com.android.uiautomator.testrunner.UiAutomatorTestCase;
import java.io.File;

/** QA-only shell helper: take a fresh accessibility snapshot without waiting for animated UI to idle. */
public final class FastDump extends UiAutomatorTestCase {
  public void testSnapshot() throws Exception {
    Configurator.getInstance().setWaitForIdleTimeout(0);
    getUiDevice().setCompressedLayoutHeirarchy(true);
    File snapshot=new File(new File(android.os.Environment.getDataDirectory(),"local/tmp"),"wildfall-fast.xml");
    snapshot.delete();
    for(int attempt=0;attempt<10&&!snapshot.isFile();attempt++){
      sleep(400);
      getUiDevice().dumpWindowHierarchy("wildfall-fast.xml");
    }
    assertTrue("Fresh snapshot required at "+snapshot+"; focused package: "+getUiDevice().getCurrentPackageName(),snapshot.isFile());
    android.os.Bundle result=new android.os.Bundle();
    result.putString("stream","WILDFALL_XML_BEGIN"+new String(java.nio.file.Files.readAllBytes(snapshot.toPath()),java.nio.charset.StandardCharsets.UTF_8)+"WILDFALL_XML_END");
    getAutomationSupport().sendStatus(0,result);
  }
}
