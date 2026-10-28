Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\WIN\.gemini\antigravity\scratch\mobile_billing_app"
WshShell.Run "node server.js", 0, False
WshShell.Run "ngrok http 5000", 0, False
