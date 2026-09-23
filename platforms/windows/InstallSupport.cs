using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Collections.Generic;
static class InstallSupport {
 static string Request(string route,string token){
  var request=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:47831/api/"+route);request.Timeout=5000;
  if(token!=null){request.Method="POST";request.ContentType="application/json";request.Headers["Origin"]="http://127.0.0.1:47831";request.Headers["X-Vimaka-Token"]=token;byte[] data=Encoding.UTF8.GetBytes("{\"confirm\":true}");request.ContentLength=data.Length;using(var stream=request.GetRequestStream())stream.Write(data,0,data.Length);}
  using(var response=request.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd();
 }
 internal static void Stop(){
  var session=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(Request("session",null));
  if(!session.ContainsKey("local")||!object.Equals(session["local"],true))throw new Exception("Invalid local component.");
  try{Request("shutdown",(string)session["csrf"]);}catch(WebException){throw new Exception("Conclua as operacoes em andamento antes de atualizar. / Finish running operations before updating. / Finalice las operaciones antes de actualizar.");}
  // Do not terminate processes: wait for the application to release its files.
  Thread.Sleep(500);
 }
 internal static void Move(string from,string to){
  for(int attempt=0;;attempt++){try{Directory.Move(from,to);return;}catch(IOException){if(attempt>=19)throw;Thread.Sleep(250);}}
 }
 internal static void ValidateRoot(string root){
  if(Directory.Exists(root)&&(File.GetAttributes(root)&FileAttributes.ReparsePoint)!=0)throw new Exception("Installation directory cannot be a symbolic link.");
 }
}
