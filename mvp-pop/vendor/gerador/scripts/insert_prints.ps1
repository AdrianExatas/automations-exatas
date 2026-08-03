param(
  [Parameter(Mandatory = $true)][string]$DocxPath,
  [Parameter(Mandatory = $true)][string]$ManifestJson
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $DocxPath)) { throw "DOCX não encontrado: $DocxPath" }
if (-not (Test-Path -LiteralPath $ManifestJson)) { throw "Manifesto não encontrado: $ManifestJson" }

$manifest = Get-Content -LiteralPath $ManifestJson -Raw | ConvertFrom-Json
if (-not $manifest) { return }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open([System.IO.Path]::GetFullPath($DocxPath))
  foreach ($item in @($manifest)) {
    $etapa = [string]$item.etapa_id
    $img = [string]$item.path
    if (-not (Test-Path -LiteralPath $img)) { continue }

    $inserted = $false
    foreach ($cc in @($doc.ContentControls)) {
      $tag = [string]$cc.Tag
      $title = [string]$cc.Title
      if (($tag -and $tag -match [regex]::Escape($etapa)) -or ($title -and $title -match [regex]::Escape($etapa))) {
        try {
          $cc.Range.InlineShapes.AddPicture($img) | Out-Null
          $inserted = $true
          break
        } catch { }
      }
    }

    if (-not $inserted) {
      # fallback: append at end with caption
      $end = $doc.Content
      $end.Collapse(0) | Out-Null
      $end.InsertParagraphAfter() | Out-Null
      $end.InsertAfter("Print $etapa — $($item.rotulo)") | Out-Null
      $end.InsertParagraphAfter() | Out-Null
      $end.InlineShapes.AddPicture($img) | Out-Null
    }
  }
  $doc.Save()
  $doc.Close()
} finally {
  $word.Quit()
}
