[CmdletBinding()]
param(
  [switch]$SkipOffice,
  [switch]$KeepArtifacts
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

function Assert-True {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if (-not $Condition) { throw "FALHA: $Message" }
  Write-Output "OK: $Message"
}

function Write-JsonUtf8 {
  param(
    [Parameter(Mandatory = $true)]$Value,
    [Parameter(Mandatory = $true)][string]$Path
  )
  $json = $Value | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($Path, $json, (New-Object System.Text.UTF8Encoding($true)))
}

function Invoke-PowerShellScript {
  param(
    [Parameter(Mandatory = $true)][string]$Script,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  $processArguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $Script
  ) + $Arguments
  & powershell.exe @processArguments
  if ($LASTEXITCODE -ne 0) {
    throw "O script falhou com codigo $LASTEXITCODE`: $Script"
  }
}

function Assert-CanonicalContract {
  param([Parameter(Mandatory = $true)]$Content)

  Assert-True ([string]$Content.schema_version -eq '2.0') 'schema_version normalizada para 2.0'
  Assert-True (@($Content.documentos_solicitados).Count -ge 1) 'ha ao menos um documento solicitado'
  foreach ($property in @('arquivo_pop', 'arquivo_it', 'arquivo_form', 'arquivo_mp')) {
    Assert-True ($null -ne $Content.saida.PSObject.Properties[$property]) "saida.$property esta presente"
  }
  foreach ($property in @('codigo_pop', 'codigo_it', 'codigo_form', 'codigo_mp')) {
    Assert-True ($null -ne $Content.documento.PSObject.Properties[$property]) "documento.$property esta presente"
  }
  Assert-True ($null -ne $Content.pop.etapas) 'pop.etapas esta presente'
  Assert-True ($null -ne $Content.it.secoes) 'it.secoes esta presente'
  Assert-True ($null -ne $Content.form.blocos) 'form.blocos esta presente'
  Assert-True ($null -ne $Content.mp.riscos) 'mp.riscos esta presente'
  Assert-True ($null -ne $Content.lista_mestra) 'lista_mestra esta presente'
  Assert-True (@($Content.lista_mestra.entradas).Count -ge @($Content.documentos_solicitados).Count) 'lista_mestra cobre os documentos solicitados'
}

function Assert-Selection {
  param(
    [Parameter(Mandatory = $true)]$Content,
    [Parameter(Mandatory = $true)][string]$OutputDir,
    [Parameter(Mandatory = $true)][string[]]$ExpectedTypes
  )

  $fileByType = @{
    pop = [string]$Content.saida.arquivo_pop
    it = [string]$Content.saida.arquivo_it
    form = [string]$Content.saida.arquivo_form
    mp = [string]$Content.saida.arquivo_mp
  }
  $docsDir = Join-Path $OutputDir 'documentos'
  $geracaoDir = Join-Path $OutputDir 'geracao'
  foreach ($type in @('pop', 'it', 'form', 'mp')) {
    $exists = Test-Path -LiteralPath (Join-Path $docsDir $fileByType[$type]) -PathType Leaf
    if ($ExpectedTypes -contains $type) {
      Assert-True $exists "selecao gerou apenas o arquivo esperado de $type"
    } else {
      Assert-True (-not $exists) "selecao nao gerou o arquivo nao solicitado de $type"
    }
  }
  Assert-True (Test-Path -LiteralPath (Join-Path $geracaoDir 'relatorio-validacao.md') -PathType Leaf) 'relatorio de validacao foi promovido'
  Assert-True (Test-Path -LiteralPath (Join-Path $geracaoDir 'content.normalized.json') -PathType Leaf) 'JSON normalizado foi promovido'
  Assert-True (Test-Path -LiteralPath (Join-Path $docsDir 'FORM.QUA.003 - Lista Documental Mestra Aplicada.xlsx') -PathType Leaf) 'lista mestra foi promovida em documentos'
  Assert-True (Test-Path -LiteralPath (Join-Path $geracaoDir 'lista-mestra-entradas.json') -PathType Leaf) 'dump da lista mestra foi promovido'
}

function Get-ExpectedPrintFieldCount {
  param([Parameter(Mandatory = $true)]$Content)
  return @($Content.it.secoes | Where-Object { $_.campo_print.incluir }).Count
}

function Assert-NoAutomaticEvidenceImages {
  param(
    [Parameter(Mandatory = $true)][string]$DocumentPath,
    [Parameter(Mandatory = $true)][int]$ExpectedFields
  )

  $word = $null
  $document = $null
  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($DocumentPath, $false, $true, $false)
    $pictureControls = @($document.ContentControls | Where-Object { [string]$_.Tag -like 'PRINT-*' })
    Assert-True ($pictureControls.Count -eq $ExpectedFields) "IT contem $ExpectedFields campo(s) manual(is) de print"
    foreach ($control in $pictureControls) {
      Assert-True ($control.Type -eq 2) "controle $($control.Tag) usa o tipo de figura do Word"
      Assert-True ([bool]$control.ShowingPlaceholderText) "controle $($control.Tag) permanece vazio para insercao manual"
    }

    $bodyImages = 0
    foreach ($shape in $document.InlineShapes) {
      if ($shape.Range.StoryType -eq 1) { $bodyImages++ }
    }
    $placeholderImages = 0
    foreach ($control in $pictureControls) { $placeholderImages += $control.Range.InlineShapes.Count }
    Assert-True ($bodyImages -eq $placeholderImages) 'nao ha imagem solta no corpo da IT'
  } finally {
    if ($null -ne $document) {
      $document.Close($false)
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
    }
    if ($null -ne $word) {
      $word.Quit()
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($DocumentPath)
  try {
    $relationships = $archive.GetEntry('word/_rels/document.xml.rels')
    Assert-True ($null -ne $relationships) 'pacote DOCX contem relacionamentos do corpo'
    $reader = New-Object System.IO.StreamReader($relationships.Open())
    try { $relationshipsXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    # O proprio controle de figura vazio do Word usa uma pequena imagem de
    # placeholder e, por isso, pode criar uma unica relacao de imagem no corpo.
    # A garantia contra print automatico vem da combinacao: todos os controles
    # exibem placeholder, nao ha imagem solta e nao ha relacoes extras.
    $bodyImageRelations = [regex]::Matches($relationshipsXml, 'Type="[^"]+/image"').Count
    $maximumPlaceholderRelations = if ($ExpectedFields -gt 0) { 1 } else { 0 }
    Assert-True ($bodyImageRelations -le $maximumPlaceholderRelations) 'corpo da IT contem somente a imagem interna do placeholder do Word'

    $documentXmlEntry = $archive.GetEntry('word/document.xml')
    $reader = New-Object System.IO.StreamReader($documentXmlEntry.Open())
    try { $documentXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    Assert-True (-not $documentXml.Contains('fixture-print-que-nao-existe.png')) 'nome de imagem legado nao foi transportado ao DOCX'
  } finally {
    $archive.Dispose()
  }
}

function Assert-NoImageArtifacts {
  param([Parameter(Mandatory = $true)][string]$OutputDir)
  $imageFiles = @(
    Get-ChildItem -LiteralPath $OutputDir -Recurse -File |
      Where-Object { $_.Extension.ToLowerInvariant() -in @('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp') }
  )
  Assert-True ($imageFiles.Count -eq 0) 'a saida nao contem arquivos de imagem gerados ou copiados'
}

function New-SelectionContent {
  param(
    [Parameter(Mandatory = $true)][string]$FixturePath,
    [Parameter(Mandatory = $true)][string[]]$Types,
    [Parameter(Mandatory = $true)][string]$TargetPath
  )
  $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $FixturePath | ConvertFrom-Json
  $content.documentos_solicitados = [object[]]$Types
  Write-JsonUtf8 $content $TargetPath
  return $content
}

function Invoke-OfficeCase {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InputJson,
    [Parameter(Mandatory = $true)][string[]]$ExpectedTypes,
    [Parameter(Mandatory = $true)][string]$CaseRoot,
    [Parameter(Mandatory = $true)][string]$BuildScript,
    [Parameter(Mandatory = $true)][string]$NormalizeScript
  )
  Write-Output "`nCASO OFFICE: $Name"
  $outputDir = Join-Path $CaseRoot 'saida'
  [System.IO.Directory]::CreateDirectory($outputDir) | Out-Null
  Invoke-PowerShellScript $BuildScript @('-ContentJson', $InputJson, '-OutputDir', $outputDir)

  $normalizedPath = Join-Path $CaseRoot 'normalizado.json'
  Invoke-PowerShellScript $NormalizeScript @('-ContentJson', $InputJson, '-OutputJson', $normalizedPath)
  $normalized = Get-Content -Raw -Encoding UTF8 -LiteralPath $normalizedPath | ConvertFrom-Json
  Assert-Selection $normalized $outputDir $ExpectedTypes
  Assert-NoImageArtifacts $outputDir
  if ($ExpectedTypes -contains 'it') {
    $itPath = Join-Path (Join-Path $outputDir 'documentos') ([string]$normalized.saida.arquivo_it)
    Assert-NoAutomaticEvidenceImages $itPath (Get-ExpectedPrintFieldCount $normalized)
  }
}

$repoRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$skillRoot = Join-Path $repoRoot 'skills\gerar-pop-it'
$normalizeScript = Join-Path $skillRoot 'scripts\normalize_content.ps1'
$buildScript = Join-Path $skillRoot 'scripts\build_documents.ps1'
$schemaPath = Join-Path $skillRoot 'references\content-v2.schema.json'
$v2Fixture = Join-Path $PSScriptRoot 'fixtures\content-v2-minimal.json'
$legacyFixture = Join-Path $PSScriptRoot 'fixtures\content-legacy-minimal.json'
$suffix = [guid]::NewGuid().ToString('N')
$testRootName = 'gerar pop it testes a' + [char]0x00E7 + [char]0x00E3 + 'o ' + $suffix
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) $testRootName
[System.IO.Directory]::CreateDirectory($testRoot) | Out-Null

try {
  Write-Output 'CONTRATO E NORMALIZACAO'
  foreach ($jsonPath in @($schemaPath, $v2Fixture, $legacyFixture)) {
    $null = Get-Content -Raw -Encoding UTF8 -LiteralPath $jsonPath | ConvertFrom-Json
    Assert-True $true "JSON valido: $jsonPath"
  }

  $normalizedV2Path = Join-Path $testRoot 'v2-normalizado.json'
  Invoke-PowerShellScript $normalizeScript @('-ContentJson', $v2Fixture, '-OutputJson', $normalizedV2Path)
  $normalizedV2 = Get-Content -Raw -Encoding UTF8 -LiteralPath $normalizedV2Path | ConvertFrom-Json
  Assert-CanonicalContract $normalizedV2
  Assert-True (@($normalizedV2.documentos_solicitados).Count -eq 4) 'fixture v2 preserva a selecao dos quatro documentos'
  Assert-True ([string]$normalizedV2.pop.etapas[0].id -eq 'E01') 'fixture v2 preserva o ID estavel da etapa'
  Assert-True ($null -eq $normalizedV2.mp.riscos[0].probabilidade -and $null -eq $normalizedV2.mp.riscos[0].gravidade) 'risco sugerido permanece com P e G vazios'

  $normalizedLegacyPath = Join-Path $testRoot 'legado-normalizado.json'
  Invoke-PowerShellScript $normalizeScript @('-ContentJson', $legacyFixture, '-OutputJson', $normalizedLegacyPath)
  $normalizedLegacy = Get-Content -Raw -Encoding UTF8 -LiteralPath $normalizedLegacyPath | ConvertFrom-Json
  Assert-CanonicalContract $normalizedLegacy
  Assert-True ((@($normalizedLegacy.documentos_solicitados) -join ',') -eq 'pop,it') 'aliases PR/IN viram pop/it'
  Assert-True (@($normalizedLegacy.it.secoes[0].instrucoes).Count -eq 2) 'paragrafos legados viram instrucoes'
  Assert-True ([string]$normalizedLegacy.it.secoes[0].caminho -eq 'Sistema > Compatibilidade') 'caminho legado e recuperado'
  Assert-True (@($normalizedLegacy.it.secoes[0].atencoes).Count -eq 1) 'alerta legado e recuperado'
  Assert-True ([bool]$normalizedLegacy.it.secoes[0].campo_print.incluir) 'print_id legado cria somente campo manual'
  Assert-True ([string]$normalizedLegacy.it.secoes[0].campo_print.legenda -eq 'Imagem 1 - Campo manual recuperado do legado.') 'legenda do print legado e recuperada'
  $legacyNormalizedText = Get-Content -Raw -Encoding UTF8 -LiteralPath $normalizedLegacyPath
  Assert-True (-not ($legacyNormalizedText -match 'fixture-print-que-nao-existe|timestamp|redactions|"arquivo"')) 'metadados de imagem legados sao descartados'

  Write-Output "`nQUALIDADE E LISTA MESTRA"
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
  Assert-True ($null -ne $python) 'Python esta disponivel para testes sem Office'
  $qualityScript = Join-Path $skillRoot 'scripts\validate_content_quality.py'
  $listaScript = Join-Path $skillRoot 'scripts\update_lista_mestra.py'
  $qualityReport = Join-Path $testRoot 'relatorio-qualidade.md'
  & $python.Source @($qualityScript, '--content-json', $normalizedV2Path, '--report-path', $qualityReport)
  Assert-True ($LASTEXITCODE -eq 0) 'gate semântico passa no fixture v2'
  Assert-True (Test-Path -LiteralPath $qualityReport -PathType Leaf) 'relatorio-qualidade.md foi gerado'

  $pendingText = (@($normalizedV2.pontos_validacao) -join "`n")
  Assert-True ($pendingText -match 'revisar P/G dos riscos sugeridos') 'pendencias de risco sugerido foram agrupadas'

  $listaRoot = Join-Path $testRoot 'lista-mestra'
  [System.IO.Directory]::CreateDirectory($listaRoot) | Out-Null
  $entriesJson = Join-Path $listaRoot 'lista-mestra-entradas.json'
  & $python.Source @(
    $listaScript,
    '--content-json', $normalizedV2Path,
    '--output-dir', $listaRoot,
    '--entries-json', $entriesJson
  )
  Assert-True ($LASTEXITCODE -eq 0) 'upsert inicial da lista mestra concluido'
  $listaFile = Join-Path (Join-Path $listaRoot 'documentos') 'FORM.QUA.003 - Lista Documental Mestra Aplicada.xlsx'
  Assert-True (Test-Path -LiteralPath $listaFile -PathType Leaf) 'FORM.QUA.003 foi gerado no output'
  $firstDump = Get-Content -Raw -Encoding UTF8 -LiteralPath $entriesJson | ConvertFrom-Json
  Assert-True (@($firstDump.aplicadas).Count -eq 4) 'lista mestra recebeu 4 entradas do pacote'
  Assert-True ((@($firstDump.aplicadas | Where-Object { $_.created }).Count) -eq 4) 'primeira execucao cria as 4 linhas'

  & $python.Source @(
    $listaScript,
    '--content-json', $normalizedV2Path,
    '--output-dir', $listaRoot,
    '--entries-json', $entriesJson,
    '--lista-mestra-path', $listaFile
  )
  Assert-True ($LASTEXITCODE -eq 0) 'segundo upsert da lista mestra concluido'
  $secondDump = Get-Content -Raw -Encoding UTF8 -LiteralPath $entriesJson | ConvertFrom-Json
  Assert-True ((@($secondDump.aplicadas | Where-Object { $_.created }).Count) -eq 0) 'segunda execucao atualiza sem duplicar'

  if ($SkipOffice) {
    Write-Output "`nTestes Office ignorados por -SkipOffice."
  } else {
    Assert-True ($null -ne [type]::GetTypeFromProgID('Word.Application')) 'Microsoft Word COM esta disponivel'
    Assert-True ($null -ne [type]::GetTypeFromProgID('Excel.Application')) 'Microsoft Excel COM esta disponivel'

    $popItRoot = Join-Path $testRoot 'pop-it'
    [System.IO.Directory]::CreateDirectory($popItRoot) | Out-Null
    $popItJson = Join-Path $popItRoot 'entrada.json'
    $null = New-SelectionContent $v2Fixture @('pop', 'it') $popItJson
    Invoke-OfficeCase 'POP/IT' $popItJson @('pop', 'it') $popItRoot $buildScript $normalizeScript

    $formMpRoot = Join-Path $testRoot 'form-mp'
    [System.IO.Directory]::CreateDirectory($formMpRoot) | Out-Null
    $formMpJson = Join-Path $formMpRoot 'entrada.json'
    $null = New-SelectionContent $v2Fixture @('form', 'mp') $formMpJson
    Invoke-OfficeCase 'FORM/MP' $formMpJson @('form', 'mp') $formMpRoot $buildScript $normalizeScript

    $allRoot = Join-Path $testRoot 'todos'
    [System.IO.Directory]::CreateDirectory($allRoot) | Out-Null
    Invoke-OfficeCase 'TODOS' $v2Fixture @('pop', 'it', 'form', 'mp') $allRoot $buildScript $normalizeScript

    $legacyRoot = Join-Path $testRoot 'legado-pop-it'
    [System.IO.Directory]::CreateDirectory($legacyRoot) | Out-Null
    Invoke-OfficeCase 'LEGADO POP/IT' $legacyFixture @('pop', 'it') $legacyRoot $buildScript $normalizeScript
  }

  Write-Output "`nSUCESSO: todos os testes de contrato foram concluidos."
} finally {
  if ($KeepArtifacts) {
    Write-Output "Artefatos mantidos em: $testRoot"
  } elseif (Test-Path -LiteralPath $testRoot -PathType Container) {
    $resolved = [System.IO.Path]::GetFullPath($testRoot)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolved.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        ([System.IO.Path]::GetFileName($resolved) -like 'gerar pop it testes a*')) {
      [System.IO.Directory]::Delete($resolved, $true)
    }
  }
}
