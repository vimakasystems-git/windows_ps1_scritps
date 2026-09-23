using System;
using System.IO;
using System.Text;
using System.Diagnostics;
public class VimakaNativeResult { public string Output; public int ExitCode; }
public static class VimakaNativeRunner {
 public static VimakaNativeResult Run(string executable,string arguments,string log){
  var encoding=Path.GetFileName(executable).Equals("sfc.exe",StringComparison.OrdinalIgnoreCase)?Encoding.Unicode:Encoding.GetEncoding(System.Globalization.CultureInfo.CurrentCulture.TextInfo.OEMCodePage);
  var info=new ProcessStartInfo(executable,arguments){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=encoding,StandardErrorEncoding=encoding};
  using(var process=Process.Start(info)){
   var errors=process.StandardError.ReadToEndAsync();var output=new StringBuilder();char[] buffer=new char[512];int count;
   while((count=process.StandardOutput.Read(buffer,0,buffer.Length))>0){string chunk=new string(buffer,0,count);output.Append(chunk);File.AppendAllText(log,chunk,new UTF8Encoding(false));}
   process.WaitForExit();output.Append(errors.Result);File.AppendAllText(log,errors.Result,new UTF8Encoding(false));
   return new VimakaNativeResult {Output=output.ToString(),ExitCode=process.ExitCode};
  }
 }
}
