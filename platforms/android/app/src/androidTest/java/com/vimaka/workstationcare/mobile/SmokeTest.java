package com.vimaka.workstationcare.mobile;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.app.Instrumentation;
import android.content.Intent;
import android.webkit.WebView;
import android.view.ViewGroup;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.*;
@RunWith(AndroidJUnit4.class) public class SmokeTest {
 @Test public void diagnoseAndBenchmark() throws Exception {
  Instrumentation inst=InstrumentationRegistry.getInstrumentation();
  Intent intent=new Intent(inst.getTargetContext(),MainActivity.class);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  MainActivity activity=(MainActivity)inst.startActivitySync(intent);
  try {
   String[] value={""};
   for(int i=0;i<40;i++){CountDownLatch ready=new CountDownLatch(1);inst.runOnMainSync(()->{WebView web=(WebView)((ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0);web.evaluateJavascript("document.getElementById('cards')?.textContent",v->{value[0]=v;ready.countDown();});});assertTrue(ready.await(5,TimeUnit.SECONDS));if(value[0].contains("Android"))break;Thread.sleep(250);}
   assertTrue(value[0],value[0].contains("Android"));
   inst.runOnMainSync(()->{WebView web=(WebView)((ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0);web.evaluateJavascript("document.getElementById('benchmark').click()",null);});
   for(int i=0;i<60;i++){CountDownLatch ready=new CountDownLatch(1);inst.runOnMainSync(()->{WebView web=(WebView)((ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0);web.evaluateJavascript("document.getElementById('status').textContent",v->{value[0]=v;ready.countDown();});});assertTrue(ready.await(5,TimeUnit.SECONDS));if(value[0].contains("concluído"))break;Thread.sleep(250);}
   assertTrue(value[0],value[0].contains("concluído"));
  } finally {inst.runOnMainSync(activity::finish);}
 }
}
