using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Web.Script.Serialization;
using System.Collections.Generic;
class Launcher {
 static string Text(string pt,string en,string es){string lang=System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;return lang=="en"?en:lang=="es"?es:pt;}
 static string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VimakaWindowsCare");
 static string AppDir=Path.Combine(Root,"app");
 static string Backup=null;
 static bool Replaced=false;
 static string Url="http://127.0.0.1:47831/";
 static bool Online(){try{var r=(HttpWebRequest)WebRequest.Create(Url+"api/session");r.Timeout=1200;using(var response=r.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd().Contains("\"local\":true");}catch{return false;}}
 static string Quote(string s){return "'"+s.Replace("'","''")+"'";}
 static string RunPowerShell(string arguments){
  var p=new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"System32\\WindowsPowerShell\\v1.0\\powershell.exe"),"-NoProfile -NonInteractive "+arguments);
  p.UseShellExecute=false;p.CreateNoWindow=true;p.RedirectStandardOutput=true;p.RedirectStandardError=true;
  using(var process=Process.Start(p)){var output=process.StandardOutput.ReadToEndAsync();var error=process.StandardError.ReadToEndAsync();process.WaitForExit();if(process.ExitCode!=0)throw new Exception(error.Result+output.Result);return output.Result;}
 }
 static void PowerShell(string code){RunPowerShell("-EncodedCommand "+Convert.ToBase64String(Encoding.Unicode.GetBytes(code)));}
 [STAThread] static int Main(string[] args){try{
  bool acceptInstall=Array.IndexOf(args,"--accept-install")>=0;
  bool background=Array.IndexOf(args,"--background")>=0;
  using(var payload=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip")){
   if(payload!=null){
    InstallSupport.ValidateRoot(Root);InstallSupport.ValidateRoot(AppDir);
    Directory.CreateDirectory(Root);
    string stage=Path.Combine(Root,"stage-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
    using(var zip=new ZipArchive(payload,ZipArchiveMode.Read))foreach(var e in zip.Entries){
      string target=Path.GetFullPath(Path.Combine(stage,e.FullName));
      if(!target.StartsWith(Path.GetFullPath(stage)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Invalid package path.");
      if(e.FullName.EndsWith("/")){Directory.CreateDirectory(target);continue;}
      Directory.CreateDirectory(Path.GetDirectoryName(target));e.ExtractToFile(target,true);
    }
    string requirements="-ExecutionPolicy Bypass -File \""+Path.Combine(stage,"native","Prerequisites.ps1")+"\"";
    var checks=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(RunPowerShell(requirements+" -CheckOnly"));
    bool needsEdge=(bool)checks["edgeRequired"];
    string plan=Text("Instalar/atualizar Vimaka Windows Care e Node.js incluido (executa o componente local). A versao anterior sera substituida; diagnosticos e historico serao preservados. Nao exige administrador. Nenhum reparo sera executado.","Install/update Vimaka Windows Care and bundled Node.js (runs the local component). The previous version will be replaced; diagnostics and history will be preserved. No administrator required. No repairs will run.","Instalar/actualizar Vimaka Windows Care y Node.js incluido (ejecuta el componente local). Se sustituira la version anterior y se conservaran los datos. No requiere administrador. No se ejecutaran reparaciones.");
    if(needsEdge)plan+="\n\n"+Text("Nenhum navegador compativel encontrado. Sera baixado e instalado o Microsoft Edge para exibir a interface. Download oficial Microsoft com hash e assinatura verificados. O Windows pedira credenciais de administrador. Sem elas, procure o administrador da maquina.","No compatible browser found. Microsoft Edge will be downloaded and installed to display the interface. Official Microsoft download with hash and signature verification. Windows will request administrator credentials. Without them, contact your administrator.","No se encontro un navegador compatible. Se descargara e instalara Microsoft Edge para mostrar la interfaz. Descarga oficial con hash y firma verificados. Windows solicitara credenciales de administrador. Si no las tiene, contacte al administrador.");
    if((!acceptInstall||needsEdge)&&MessageBox.Show(plan,"Vimaka Windows Care",MessageBoxButtons.OKCancel,MessageBoxIcon.Information)!=DialogResult.OK)return 0;
    RunPowerShell(requirements);
    var probe=new ProcessStartInfo(Path.Combine(stage,"node.exe"),"--version"){UseShellExecute=false,CreateNoWindow=true};using(var process=Process.Start(probe)){process.WaitForExit();if(process.ExitCode!=0)throw new Exception("Node.js could not start.");}
    if(Online())InstallSupport.Stop();
    if(Directory.Exists(AppDir)){string previous=Path.Combine(Root,"previous-"+Guid.NewGuid().ToString("N"));InstallSupport.Move(AppDir,previous);Backup=previous;}
    InstallSupport.Move(stage,AppDir);Replaced=true;
    string exe=Path.Combine(AppDir,"VimakaWindowsCare.exe");
    string desktop=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"Vimaka Windows Care.lnk");
    string menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Vimaka Windows Care.lnk");
    string script="$ErrorActionPreference='Stop'; $w=New-Object -ComObject WScript.Shell; foreach($p in @("+Quote(desktop)+","+Quote(menu)+")){ $s=$w.CreateShortcut($p);$s.TargetPath="+Quote(exe)+";$s.WorkingDirectory="+Quote(AppDir)+";$s.IconLocation="+Quote(exe)+";$s.Save() }";
    PowerShell(script);
    using(var key=Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Run"))key.SetValue("VimakaWindowsCare","\""+exe+"\" --background");
    using(var key=Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VimakaWindowsCare")){
     key.SetValue("DisplayName","Vimaka Windows Care");key.SetValue("DisplayVersion","0.1.8");key.SetValue("Publisher","Vimaka Sistemas Inteligentes");
     key.SetValue("InstallLocation",AppDir);key.SetValue("DisplayIcon",exe);
     key.SetValue("UninstallString","powershell.exe -NoProfile -ExecutionPolicy Bypass -File \""+Path.Combine(AppDir,"native","Uninstall.ps1")+"\"");
    }
   }
  }
  if(!Online()){
    string node=Path.Combine(AppDir,"node.exe"),server=Path.Combine(AppDir,"server.mjs");
    if(!File.Exists(node)||!File.Exists(server))throw new Exception(Text("Instalacao nao encontrada. Execute VimakaWindowsCare-Setup.exe.","Installation not found. Run VimakaWindowsCare-Setup.exe.","Instalacion no encontrada. Ejecute VimakaWindowsCare-Setup.exe."));
    var info=new ProcessStartInfo(node,"\""+server+"\"");info.WorkingDirectory=AppDir;info.UseShellExecute=false;info.CreateNoWindow=true;Process.Start(info);
    bool ready=false;for(int i=0;i<30;i++){Thread.Sleep(400);if(Online()){ready=true;break;}}
    if(!ready)throw new Exception(Text("O componente local nao iniciou. Verifique se a porta 47831 esta em uso.","The local component did not start. Check whether port 47831 is in use.","El componente local no se inicio. Compruebe si el puerto 47831 esta en uso."));
  }
  if(!background){
    string edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft\\Edge\\Application\\msedge.exe");
    if(File.Exists(edge))Process.Start(new ProcessStartInfo(edge,"--app="+Url){UseShellExecute=true});
    else Process.Start(new ProcessStartInfo(Url){UseShellExecute=true});
  }
  if(Replaced)File.WriteAllText(Path.Combine(Root,"last-install.txt"),"0.1.8 OK "+DateTime.UtcNow.ToString("o")+"\nPrevious version: "+Backup);
  return 0;
 }catch(Exception e){if(Backup!=null){try{if(Directory.Exists(AppDir))InstallSupport.Move(AppDir,Path.Combine(Root,"failed-"+Guid.NewGuid().ToString("N")));InstallSupport.Move(Backup,AppDir);}catch(Exception rollback){e=new Exception(e.Message+"\nRollback: "+rollback.Message);}}File.WriteAllText(Path.Combine(Path.GetTempPath(),"Vimaka-install-error.txt"),e.ToString());MessageBox.Show(e.Message,"Vimaka Windows Care",MessageBoxButtons.OK,MessageBoxIcon.Warning);return 1;}}
}
