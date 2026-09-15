param(
  [Parameter(Mandatory=$true)][string]$ContentJson,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [string]$ListaMestraPath = '',
  [string[]]$DocumentTypes = @(),
  [switch]$UpdateListaMestra,
  [switch]$SkipListaMestra,
  [switch]$PreferOpenpyxl,
  [switch]$UseExcelCom,
  [switch]$SkipMpFidelity,
  [switch]$SkipFormFidelity
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

function Test-OfficeCom {
  param([string]$ProgId, [string]$Label)
  if ($null -eq [type]::GetTypeFromProgID($ProgId)) { throw "$Label desktop não foi localizado." }
}

function Write-PendingReport {
  param($Content, [string]$Target)
  $pending = New-Object System.Collections.Generic.List[string]
  foreach ($item in (ConvertTo-StringArray $Content.pontos_validacao)) {
    if (-not $pending.Contains($item)) { $pending.Add($item) }
  }
  $transcriptionStatus = [string](Get-PropertyValue $Content.transcricao 'status' 'fornecida')
  if ($transcriptionStatus -notin @('concluida', 'fornecida')) {
    $item = 'Ponto para validação: revisar a transcrição fornecida; o texto não pôde ser usado com segurança.'
    if (-not $pending.Contains($item)) { $pending.Add($item) }
  }
  if ($pending.Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('# Pendências para validação')
  $lines.Add('')
  foreach ($item in $pending) { $lines.Add("- $item") }
  [System.IO.File]::WriteAllLines($Target, $lines.ToArray(), (New-Object System.Text.UTF8Encoding($true)))
}

function Resolve-RequestedDocumentTypes {
  param($Content, [string[]]$ExplicitTypes)
  $source = @($ExplicitTypes)
  if ($source.Count -eq 0) {
    $source = @($Content.documentos_solicitados)
  }
  $resolved = New-Object System.Collections.Generic.List[string]
  foreach ($token in $source) {
    # Evita [string]$array -> "System.String[]"
    if ($token -is [System.Array] -and $token -isnot [string]) {
      foreach ($inner in @($token)) {
        if ($null -eq $inner) { continue }
        foreach ($part in (([string]$inner) -split '[,;|\s]+')) {
          $kind = $part.Trim().ToLowerInvariant()
          if ([string]::IsNullOrWhiteSpace($kind)) { continue }
          switch -Regex ($kind) {
            '^(pop|pr)$' { if (-not $resolved.Contains('pop')) { [void]$resolved.Add('pop') }; break }
            '^(it|in)$' { if (-not $resolved.Contains('it')) { [void]$resolved.Add('it') }; break }
            '^form$' { if (-not $resolved.Contains('form')) { [void]$resolved.Add('form') }; break }
            '^mp$' { if (-not $resolved.Contains('mp')) { [void]$resolved.Add('mp') }; break }
            default { throw "Tipo de documento inválido em -DocumentTypes: $part" }
          }
        }
      }
      continue
    }
    foreach ($part in (([string]$token) -split '[,;|\s]+')) {
      $kind = $part.Trim().ToLowerInvariant()
      if ([string]::IsNullOrWhiteSpace($kind)) { continue }
      switch -Regex ($kind) {
        '^(pop|pr)$' { if (-not $resolved.Contains('pop')) { [void]$resolved.Add('pop') }; break }
        '^(it|in)$' { if (-not $resolved.Contains('it')) { [void]$resolved.Add('it') }; break }
        '^form$' { if (-not $resolved.Contains('form')) { [void]$resolved.Add('form') }; break }
        '^mp$' { if (-not $resolved.Contains('mp')) { [void]$resolved.Add('mp') }; break }
        default { throw "Tipo de documento inválido em -DocumentTypes: $part" }
      }
    }
  }
  if ($resolved.Count -eq 0) {
    throw 'Nenhum tipo de documento solicitado para geração.'
  }
  # Vírgula evita desembrulhar a List no pipeline do PowerShell.
  return ,$resolved
}

$sourcePath = Get-FullPath $ContentJson
$targetPath = Get-FullPath $OutputDir
$content = Read-NormalizedContent $sourcePath
$typesList = Resolve-RequestedDocumentTypes -Content $content -ExplicitTypes $DocumentTypes
$types = New-Object System.Collections.Generic.List[string]
foreach ($t in $typesList) {
  if ($t -is [string] -and -not [string]::IsNullOrWhiteSpace($t)) {
    [void]$types.Add($t)
  }
}
$types = @($types)
Write-Output ("Tipos desta execucao: " + ($types -join ','))
if (@($types | Where-Object { $_ -in @('pop', 'it') }).Count -gt 0) { Test-OfficeCom 'Word.Application' 'Microsoft Word' }
# FORM/MP são gerados por Python (openpyxl) por padrão: o Excel desktop sem ativação
# entra em funcionalidade reduzida e descarta mesclagens/formas ao salvar.
if (@($types | Where-Object { $_ -in @('form', 'mp') }).Count -gt 0 -and $UseExcelCom) {
  Test-OfficeCom 'Excel.Application' 'Microsoft Excel'
}

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('gerar-pop-it-' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($staging) | Out-Null
$normalizedPath = Join-Path $staging 'content.normalized.json'

try {
  $normalizedJson = $content | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($normalizedPath, $normalizedJson, (New-Object System.Text.UTF8Encoding($true)))

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }

  # Gate semântico (conteúdo) antes de gerar Office.
  $qualityScript = Join-Path $PSScriptRoot 'validate_content_quality.py'
  $qualityReport = Join-Path $staging 'relatorio-qualidade.md'
  if ($null -ne $python -and (Test-Path -LiteralPath $qualityScript)) {
    & $python.Source @(
      $qualityScript,
      '--content-json', $normalizedPath,
      '--report-path', $qualityReport
    )
    if ($LASTEXITCODE -ne 0) { throw 'A validação semântica do conteúdo falhou. Veja relatorio-qualidade.md.' }
  } else {
    Write-Warning 'Python/validate_content_quality.py indisponível; gate semântico ignorado.'
  }

  $wordTypes = @($types | Where-Object { $_ -in @('pop', 'it') })
  if ($wordTypes.Count -gt 0) {
    $wordScript = Join-Path $PSScriptRoot 'build_word_documents.ps1'
    if (-not (Test-Path -LiteralPath $wordScript)) { throw "Gerador Word não encontrado: $wordScript" }
    & $wordScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $wordTypes

    # Corrige mojibake residual do Word COM (UTF-8 interpretado como Latin-1).
    $repairScript = Join-Path $PSScriptRoot 'repair_docx_encoding.py'
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
    if ($null -ne $python -and (Test-Path -LiteralPath $repairScript)) {
      $docxFiles = @(Get-ChildItem -LiteralPath $staging -Filter '*.docx' -File -ErrorAction SilentlyContinue)
      if ($docxFiles.Count -gt 0) {
        & $python.Source (@($repairScript) + @($docxFiles | ForEach-Object { $_.FullName }))
      }
    }
  }

  $excelTypes = @($types | Where-Object { $_ -in @('form', 'mp') })
  if ($excelTypes.Count -gt 0) {
    $excelScript = Join-Path $PSScriptRoot 'build_excel_documents.ps1'
    $excelBuilder = Join-Path $PSScriptRoot 'build_excel_openpyxl.py'
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }

    function Invoke-OpenpyxlExcelBuild {
      if ($null -eq $python -or -not (Test-Path -LiteralPath $excelBuilder)) {
        throw "Gerador Excel openpyxl indisponível: $excelBuilder"
      }
      & $python.Source @(
        $excelBuilder,
        '--content-json', $normalizedPath,
        '--output-dir', $staging,
        '--document-types', ($excelTypes -join ',')
      )
      if ($LASTEXITCODE -ne 0) { throw "Geração Excel via openpyxl falhou." }
    }

    if ($UseExcelCom -and -not $PreferOpenpyxl) {
      if (-not (Test-Path -LiteralPath $excelScript)) { throw "Gerador Excel não encontrado: $excelScript" }
      try {
        & $excelScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $excelTypes
      } catch {
        Write-Warning ("Geração Excel via COM falhou; usando openpyxl. Detalhe: " + $_.Exception.Message)
        Invoke-OpenpyxlExcelBuild
      }
    } else {
      Write-Output 'Gerando FORM/MP via openpyxl (sem abrir Excel).'
      Invoke-OpenpyxlExcelBuild
    }
  }

  Write-PendingReport $content (Join-Path $staging 'pendencias-validacao.md')

  # Validação estrutural (ZIP/XML via Python): não depende de Word/Excel COM.
  $validator = Join-Path $PSScriptRoot 'validate_documents_structural.ps1'
  $validatorArguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $validator,
    '-ContentJson', $normalizedPath,
    '-OutputDir', $staging,
    '-DocumentTypes', ($types -join ',')
  ) + @(
    '-ReportPath', (Join-Path $staging 'relatorio-validacao.md')
  )
  & powershell.exe @validatorArguments
  if ($LASTEXITCODE -ne 0) { throw 'A validação dos documentos falhou.' }

  # Fidelidade estrutural do MP (âncora MP.FIS.001) — obrigatória salvo -SkipMpFidelity.
  if ('mp' -in $types -and -not $SkipMpFidelity) {
    $compareScript = Join-Path $PSScriptRoot 'compare_mp_fidelity.py'
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
    $referenceMp = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'referencias') -Filter '01.3 MP.FIS.001*.xlsx' -File |
      Select-Object -First 1
    $mpFileName = [string]$content.saida.arquivo_mp
    $generatedMp = Join-Path $staging $mpFileName
    if ($null -eq $python) {
      $python = Get-Command python -ErrorAction SilentlyContinue
      if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
    }
    if ($null -eq $python -or -not (Test-Path -LiteralPath $compareScript)) {
      throw "Gate de fidelidade MP indisponível (python/compare_mp_fidelity.py)."
    }
    if ($null -eq $referenceMp) {
      throw "Referência MP.FIS.001 não encontrada em $repoRoot\referencias."
    }
    if (-not (Test-Path -LiteralPath $generatedMp -PathType Leaf)) {
      throw "MP gerado não encontrado para fidelidade: $generatedMp"
    }
    Write-Output 'Validando fidelidade estrutural do MP…'
    & $python.Source @(
      $compareScript,
      '--generated', $generatedMp,
      '--reference', $referenceMp.FullName
    )
    if ($LASTEXITCODE -ne 0) { throw 'A fidelidade estrutural do MP falhou. Veja compare_mp_fidelity.py.' }
  }

  # Fidelidade estrutural do FORM (âncora FORM.QUA.002) — obrigatória salvo -SkipFormFidelity.
  if ('form' -in $types -and -not $SkipFormFidelity) {
    $compareFormScript = Join-Path $PSScriptRoot 'compare_form_fidelity.py'
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
    $referenceForm = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'referencias') -Filter 'FORM.QUA.002*.xlsx' -File |
      Select-Object -First 1
    $formFileName = [string]$content.saida.arquivo_form
    $generatedForm = Join-Path $staging $formFileName
    if ($null -eq $python) {
      $python = Get-Command python -ErrorAction SilentlyContinue
      if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
    }
    if ($null -eq $python -or -not (Test-Path -LiteralPath $compareFormScript)) {
      throw "Gate de fidelidade FORM indisponível (python/compare_form_fidelity.py)."
    }
    if ($null -eq $referenceForm) {
      throw "Referência FORM.QUA.002 não encontrada em $repoRoot\referencias."
    }
    if (-not (Test-Path -LiteralPath $generatedForm -PathType Leaf)) {
      throw "FORM gerado não encontrado para fidelidade: $generatedForm"
    }
    Write-Output 'Validando fidelidade estrutural do FORM…'
    & $python.Source @(
      $compareFormScript,
      '--generated', $generatedForm,
      '--reference', $referenceForm.FullName
    )
    if ($LASTEXITCODE -ne 0) { throw 'A fidelidade estrutural do FORM falhou. Veja compare_form_fidelity.py.' }
  }

  if (-not (Test-Path -LiteralPath $targetPath)) { [System.IO.Directory]::CreateDirectory($targetPath) | Out-Null }
  $docsDir = Join-Path $targetPath 'documentos'
  $geracaoDir = Join-Path $targetPath 'geracao'
  [System.IO.Directory]::CreateDirectory($docsDir) | Out-Null
  [System.IO.Directory]::CreateDirectory($geracaoDir) | Out-Null

  # Entregáveis finais (Word/Excel).
  $documentFiles = New-Object System.Collections.Generic.List[string]
  foreach ($type in $types) {
    switch ($type) {
      'pop' { $documentFiles.Add([string]$content.saida.arquivo_pop) }
      'it' { $documentFiles.Add([string]$content.saida.arquivo_it) }
      'form' { $documentFiles.Add([string]$content.saida.arquivo_form) }
      'mp' { $documentFiles.Add([string]$content.saida.arquivo_mp) }
    }
  }
  foreach ($fileName in $documentFiles) {
    Assert-SafeLeafName $fileName ([System.IO.Path]::GetExtension($fileName)) | Out-Null
    $source = Join-Path $staging $fileName
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Saída esperada não encontrada: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $docsDir $fileName) -Force
  }

  # Lista Documental Mestra (FORM.QUA.003) — opt-in (não roda por padrão).
  $wantListaMestra = -not $SkipListaMestra -and (
    $UpdateListaMestra -or -not [string]::IsNullOrWhiteSpace($ListaMestraPath)
  )
  if ($wantListaMestra) {
    $listaScript = Join-Path $PSScriptRoot 'update_lista_mestra.py'
    if ($null -ne $python -and (Test-Path -LiteralPath $listaScript)) {
      $listaArgs = @(
        $listaScript,
        '--content-json', $normalizedPath,
        '--output-dir', $targetPath,
        '--entries-json', (Join-Path $geracaoDir 'lista-mestra-entradas.json')
      )
      if (-not [string]::IsNullOrWhiteSpace($ListaMestraPath)) {
        $listaArgs += @('--lista-mestra-path', (Get-FullPath $ListaMestraPath))
      }
      & $python.Source $listaArgs
      if ($LASTEXITCODE -ne 0) { throw 'A atualização da Lista Documental Mestra falhou.' }
    } else {
      Write-Warning 'Python/update_lista_mestra.py indisponível; lista mestra não foi gerada.'
    }
  } elseif ($SkipListaMestra -and ($UpdateListaMestra -or -not [string]::IsNullOrWhiteSpace($ListaMestraPath))) {
    Write-Warning 'SkipListaMestra ativo: FORM.QUA.003 não foi gerado/atualizado.'
  }

  # Artefatos de geração (JSON de conteúdo, relatório e pendências).
  Copy-Item -LiteralPath $normalizedPath -Destination (Join-Path $geracaoDir 'content.normalized.json') -Force
  $sourceLeaf = [System.IO.Path]::GetFileName($sourcePath)
  Assert-SafeLeafName $sourceLeaf '.json' | Out-Null
  $sourceDest = Join-Path $geracaoDir $sourceLeaf
  $sameSourceDest = (
    [System.IO.Path]::GetFullPath($sourcePath).Equals(
      [System.IO.Path]::GetFullPath($sourceDest),
      [System.StringComparison]::OrdinalIgnoreCase
    )
  )
  if ($sourceLeaf -ieq 'content.normalized.json' -or $sameSourceDest) {
    # Já está no destino (normalizado ou content-v2 na própria pasta geracao/).
  } else {
    Copy-Item -LiteralPath $sourcePath -Destination $sourceDest -Force
  }

  $artifactFiles = New-Object System.Collections.Generic.List[string]
  $artifactFiles.Add('relatorio-validacao.md')
  if (Test-Path -LiteralPath (Join-Path $staging 'relatorio-qualidade.md')) {
    $artifactFiles.Add('relatorio-qualidade.md')
  }
  if (Test-Path -LiteralPath (Join-Path $staging 'pendencias-validacao.md')) {
    $artifactFiles.Add('pendencias-validacao.md')
  }
  foreach ($fileName in $artifactFiles) {
    Assert-SafeLeafName $fileName ([System.IO.Path]::GetExtension($fileName)) | Out-Null
    $source = Join-Path $staging $fileName
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Saída esperada não encontrada: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $geracaoDir $fileName) -Force
  }

  Write-Output "Documentos finais em $docsDir"
  Write-Output "Artefatos de geracao em $geracaoDir"
} finally {
  if (Test-Path -LiteralPath $staging) {
    $resolvedStaging = [System.IO.Path]::GetFullPath($staging)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedStaging.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        ([System.IO.Path]::GetFileName($resolvedStaging) -like 'gerar-pop-it-*')) {
      try {
        [System.IO.Directory]::Delete($resolvedStaging, $true)
      } catch {
        Start-Sleep -Seconds 2
        Get-Process EXCEL,WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        try {
          [System.IO.Directory]::Delete($resolvedStaging, $true)
        } catch {
          Write-Warning ("Nao foi possivel limpar o staging temporario: " + $resolvedStaging)
        }
      }
    }
  }
}
