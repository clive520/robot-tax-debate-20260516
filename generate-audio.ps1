Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$markdownPath = Join-Path $root "debate.md"
$audioDir = Join-Path $root "audio"
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$audioFiles = @(
  "positive-opening.wav",
  "negative-opening.wav",
  "positive-rebuttal.wav",
  "negative-rebuttal.wav",
  "negative-closing.wav",
  "positive-closing.wav",
  "judge.wav"
)

$raw = Get-Content -Path $markdownPath -Encoding UTF8 -Raw
$matches = [regex]::Matches($raw, "(?ms)^##\s+(.+?)\r?\n(.*?)(?=^##\s+|\z)")

$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speaker.GetInstalledVoices() |
  Where-Object { $_.VoiceInfo.Culture.Name -eq "zh-TW" } |
  Select-Object -First 1
if ($voice) {
  $speaker.SelectVoice($voice.VoiceInfo.Name)
}
$speaker.Rate = 0
$speaker.Volume = 100

for ($i = 0; $i -lt $matches.Count -and $i -lt $audioFiles.Count; $i++) {
  $match = $matches[$i]

  $body = $match.Groups[2].Value
  $text = $body `
    -replace "(?m)^#+\s*", "" `
    -replace "\*\*(.*?)\*\*", '$1' `
    -replace "\|", " " `
    -replace "-{3,}", " " `
    -replace "\s+", " "

  $path = Join-Path $audioDir $audioFiles[$i]
  $speaker.SetOutputToWaveFile($path)
  $speaker.Speak($text)
  $speaker.SetOutputToNull()
  Write-Output "Generated $path"
}

$speaker.Dispose()
