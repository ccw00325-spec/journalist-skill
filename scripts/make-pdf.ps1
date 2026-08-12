<#
.SYNOPSIS
  HB 발제 리포트 HTML을 PDF로 변환한다 (Chrome/Edge headless).

.EXAMPLE
  .\make-pdf.ps1 -HtmlPath ".\hb-output\2026-08-12\hb_20260812_1430.html"
  .\make-pdf.ps1 -HtmlPath ".\report.html" -PdfPath ".\report.pdf"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$HtmlPath,
  [string]$PdfPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $HtmlPath)) {
  throw "HTML 파일을 찾을 수 없습니다: $HtmlPath"
}

$html = (Resolve-Path -LiteralPath $HtmlPath).Path
if (-not $PdfPath) { $PdfPath = [IO.Path]::ChangeExtension($html, '.pdf') }

$pdfDir = Split-Path -Parent $PdfPath
if ($pdfDir -and -not (Test-Path -LiteralPath $pdfDir)) {
  New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
}

# Chrome 우선, 없으면 Edge
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $browser) {
  Write-Warning "Chrome/Edge를 찾지 못했습니다. HTML을 브라우저에서 열고 Ctrl+P → 'PDF로 저장'을 사용하세요."
  Write-Output "HTML: $html"
  exit 2
}

# file:// URI (공백·한글 경로 대응)
$uri = ([Uri]$html).AbsoluteUri
$profileDir = Join-Path ([IO.Path]::GetTempPath()) ("hb-pdf-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))

$chromeArgs = @(
  '--headless=new'
  '--disable-gpu'
  '--no-sandbox'
  '--no-first-run'
  '--no-pdf-header-footer'
  '--run-all-compositor-stages-before-draw'
  '--virtual-time-budget=10000'
  "--user-data-dir=$profileDir"
  "--print-to-pdf=$PdfPath"
  $uri
)

try {
  & $browser @chromeArgs 2>&1 | Out-Null
} finally {
  if (Test-Path -LiteralPath $profileDir) {
    Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if (Test-Path -LiteralPath $PdfPath) {
  $kb = [math]::Round((Get-Item -LiteralPath $PdfPath).Length / 1KB, 1)
  Write-Output "PDF 생성 완료: $PdfPath ($kb KB)"
  Write-Output "HTML 원본:    $html"
} else {
  Write-Warning "PDF 생성 실패. HTML을 브라우저에서 열고 Ctrl+P → 'PDF로 저장'을 사용하세요."
  Write-Output "HTML: $html"
  exit 1
}
