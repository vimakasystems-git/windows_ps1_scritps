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
class Launcher {
 static string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VimakaWindowsCare");
 static string AppDir=Path.Combine(Root,"app");
 static string Url="http://127.0.0.1:47831/";
 static bool Online(){try{var r=(HttpWebRequest)WebRequest.Create(Url+"api/session");r.Timeout=1200;using(var response=r.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd().Contains("\"local\":true");}catch{return false;}}
 static string Quote(string s){return "'"+s.Replace("'","''")+"'";}
 static void PowerShell(string code){var p=new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"System32\\WindowsPowerShell\\v1.0\\powershell.exe"),"-NoProfile -NonInteractive -EncodedCommand "+Convert.ToBase64String(Encoding.Unicode.GetBytes(code)));p.UseShellExecute=false;p.CreateNoWindow=true;using(var process=Process.Start(p)){process.WaitForExit();if(process.ExitCode!=0)throw new Exception("Falha ao criar os atalhos.");}}
 [STAThread] static int Main(string[] args){try{
  bool background=Array.IndexOf(args,"--background")>=0;
  using(var payload=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip")){
   if(payload!=null){
    if(Online())throw new Exception("Feche o componente local antes de instalar ou atualizar. O instalador nao substitui arquivos de uma instancia em execucao.");
    Directory.CreateDirectory(AppDir);
    using(var zip=new ZipArchive(payload,ZipArchiveMode.Read))foreach(var e in zip.Entries){
      string target=Path.GetFullPath(Path.Combine(AppDir,e.FullName));
      if(!target.StartsWith(Path.GetFullPath(AppDir)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Caminho invalido no pacote.");
      if(e.FullName.EndsWith("/")){Directory.CreateDirectory(target);continue;}
      Directory.CreateDirectory(Path.GetDirectoryName(target));e.ExtractToFile(target,true);
    }
    string exe=Path.Combine(AppDir,"VimakaWindowsCare.exe");
    string desktop=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"Vimaka Windows Care.lnk");
    string menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Vimaka Windows Care.lnk");
    string script="$ErrorActionPreference='Stop'; $w=New-Object -ComObject WScript.Shell; foreach($p in @("+Quote(desktop)+","+Quote(menu)+")){ $s=$w.CreateShortcut($p);$s.TargetPath="+Quote(exe)+";$s.WorkingDirectory="+Quote(AppDir)+";$s.IconLocation="+Quote(exe)+";$s.Save() }";
    PowerShell(script);
    using(var key=Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Run"))key.SetValue("VimakaWindowsCare","\""+exe+"\" --background");
    using(var key=Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VimakaWindowsCare")){
     key.SetValue("DisplayName","Vimaka Windows Care");key.SetValue("DisplayVersion","0.1.0");key.SetValue("Publisher","Vimaka Sistemas Inteligentes");
     key.SetValue("InstallLocation",AppDir);key.SetValue("DisplayIcon",exe);
     key.SetValue("UninstallString","powershell.exe -NoProfile -ExecutionPolicy Bypass -File \""+Path.Combine(AppDir,"native","Uninstall.ps1")+"\"");
    }
   }
  }
  if(!Online()){
    string node=Path.Combine(AppDir,"node.exe"),server=Path.Combine(AppDir,"server.mjs");
    if(!File.Exists(node)||!File.Exists(server))throw new Exception("Instalacao nao encontrada. Execute VimakaWindowsCare-Setup.exe.");
    var info=new ProcessStartInfo(node,"\""+server+"\"");info.WorkingDirectory=AppDir;info.UseShellExecute=false;info.CreateNoWindow=true;Process.Start(info);
    bool ready=false;for(int i=0;i<30;i++){Thread.Sleep(400);if(Online()){ready=true;break;}}
    if(!ready)throw new Exception("O componente local nao iniciou. Verifique se a porta 47831 esta em uso.");
  }
  if(!background){
    string edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft\\Edge\\Application\\msedge.exe");
    if(File.Exists(edge))Process.Start(new ProcessStartInfo(edge,"--app="+Url){UseShellExecute=true});
    else Process.Start(new ProcessStartInfo(Url){UseShellExecute=true});
  }
  return 0;
 }catch(Exception e){MessageBox.Show(e.Message,"Vimaka Windows Care",MessageBoxButtons.OK,MessageBoxIcon.Warning);return 1;}}
}
