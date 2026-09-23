package com.vimaka.workstationcare.mobile;
import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import org.json.JSONObject;
public class MainActivity extends Activity {
 private WebView web; private ValueCallback<Uri[]> picker;
 @Override public void onCreate(Bundle state){super.onCreate(state);web=new WebView(this);setContentView(web);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);
 web.setWebViewClient(new WebViewClient(){
  @Override public void onPageFinished(WebView view,String url){if(url.equals("file:///android_asset/www/index.html"))diagnose();}
  @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(!request.isForMainFrame())return true;if(uri.toString().equals("vimaka://diagnose")){diagnose();return true;}if(uri.getScheme().equals("https")){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}return true;}return true;}
 });
 web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(picker!=null)picker.onReceiveValue(null);picker=callback;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);try{startActivityForResult(intent,42);}catch(Exception e){picker.onReceiveValue(null);picker=null;}return true;}});
 web.loadUrl("file:///android_asset/www/index.html");}
 private void diagnose(){try{ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo();((ActivityManager)getSystemService(ACTIVITY_SERVICE)).getMemoryInfo(memory);StatFs disk=new StatFs(Environment.getDataDirectory().getAbsolutePath());Intent battery=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));JSONObject data=new JSONObject();data.put("platform","Android "+Build.VERSION.RELEASE);data.put("cores",Runtime.getRuntime().availableProcessors());data.put("memoryTotal",memory.totalMem);data.put("storageTotal",disk.getTotalBytes());data.put("storageAvailable",disk.getAvailableBytes());if(battery!=null){int level=battery.getIntExtra(BatteryManager.EXTRA_LEVEL,-1),scale=battery.getIntExtra(BatteryManager.EXTRA_SCALE,-1);if(level>=0&&scale>0)data.put("battery",100.0*level/scale);}web.evaluateJavascript("window.receiveNativeInfo("+data.toString()+")",null);}catch(Exception ignored){}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==42&&picker!=null){Uri[] uris=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){uris=new Uri[data.getClipData().getItemCount()];for(int i=0;i<uris.length;i++)uris[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null){uris=new Uri[]{data.getData()};}}picker.onReceiveValue(uris);picker=null;}}
 @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
