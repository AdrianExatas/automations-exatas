param(
  [Parameter(Mandatory=$true)][string]$ContentJson,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [string[]]$DocumentTypes = @(),
  [string]$ReportPath = '',
  [switch]$RequireFilledPrints
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$content = Read-NormalizedContent $ContentJson
$outputPath = Get-FullPath $OutputDir
if ($DocumentTypes.Count -eq 0) { $DocumentTypes = @($content.documentos_solicitados) }
$types = @(
  $DocumentTypes |
    ForEach-Object { ([string]$_) -split '[,;|]' } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { ConvertTo-DocumentType ([string]$_) } |
    Select-Object -Unique
)
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param([string]$Document, [string]$Name, [bool]$Ok, [string]$Detail)
  $checks.Add([PSCustomObject]@{ Document = $Document; Name = $Name; Ok = $Ok; Detail = $Detail })
}

function Get-WordDocumentText {
  param($Document)
  $builder = New-Object System.Text.StringBuilder
  [void]$builder.AppendLine([string]$Document.Content.Text)
  foreach ($section in $Document.Sections) {
    foreach ($header in $section.Headers) {
      if ($header.Exists) { [void]$builder.AppendLine([string]$header.Range.Text) }
    }
    foreach ($footer in $section.Footers) {
      if ($footer.Exists) { [void]$builder.AppendLine([string]$footer.Range.Text) }
    }
  }
  return $builder.ToString()
}

function Normalize-Text {
  param([string]$Text)
  if ($null -eq $Text) { return '' }
  return (($Text -replace '\s+', ' ').Trim()).ToUpperInvariant()
}

function Validate-WordDocuments {
  param([string[]]$RequestedTypes)

  $word = $null
  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    foreach ($kind in $RequestedTypes) {
      if ($kind -notin @('pop', 'it')) { continue }
      $fileName = if ($kind -eq 'pop') { [string]$content.saida.arquivo_pop } else { [string]$content.saida.arquivo_it }
      $path = Join-Path $outputPath $fileName
      Add-Check $kind 'arquivo-existe' (Test-Path -LiteralPath $path -PathType Leaf) $fileName
      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }

      $doc = $null
      try {
        $doc = $word.Documents.Open($path, $false, $true, $false)
        $fullText = Normalize-Text (Get-WordDocumentText $doc)
        $expectedHeader = if ($kind -eq 'pop') { 'PROCEDIMENTO' } else { 'INSTRUÇÃO DE TRABALHO' }
        $expectedCode = if ($kind -eq 'pop') { [string]$content.documento.codigo_pop } else { [string]$content.documento.codigo_it }
        Add-Check $kind 'cabecalho' ($fullText.Contains($expectedHeader)) "Esperado: $expectedHeader"
        Add-Check $kind 'titulo' ($fullText.Contains((Normalize-Text ([string]$content.documento.titulo)))) ([string]$content.documento.titulo)
        Add-Check $kind 'codigo' ($fullText.Contains((Normalize-Text $expectedCode))) $expectedCode

        $logoCount = 0
        $wideLogoCount = 0
        foreach ($section in $doc.Sections) {
          foreach ($header in $section.Headers) {
            if (-not $header.Exists) { continue }
            foreach ($shape in $header.Range.InlineShapes) {
              $logoCount++
              if ($shape.Height -gt 0 -and ($shape.Width / $shape.Height) -ge 3.0) { $wideLogoCount++ }
            }
          }
        }
        Add-Check $kind 'logo-cabecalho' ($logoCount -gt 0 -and $wideLogoCount -gt 0) "$logoCount imagem(ns), $wideLogoCount horizontal(is)"

        if ($kind -eq 'pop') {
          foreach ($label in @('O QUE', 'COMO', 'SETOR', 'REGISTRO')) {
            Add-Check $kind ("coluna-$label") ($fullText.Contains($label)) $label
          }
          Add-Check $kind 'etapas-pop' ($content.pop.etapas.Count -gt 0) "$($content.pop.etapas.Count) etapa(s)"
          foreach ($step in $content.pop.etapas) {
            Add-Check $kind ("etapa-" + [string]$step.id) ($fullText.Contains((Normalize-Text ([string]$step.o_que)))) ([string]$step.o_que)
          }
        } else {
          $expectedFields = @($content.it.secoes | Where-Object { $_.campo_print.incluir }).Count
          $pictureControls = New-Object System.Collections.Generic.List[object]
          foreach ($control in $doc.ContentControls) {
            if ([string]$control.Tag -like 'PRINT-*') { $pictureControls.Add($control) }
          }
          Add-Check $kind 'campos-print' ($pictureControls.Count -eq $expectedFields) "$($pictureControls.Count) encontrado(s), $expectedFields esperado(s)"

          $wrongType = @($pictureControls.ToArray() | Where-Object { $_.Type -ne 2 }).Count
          Add-Check $kind 'campos-print-clicaveis' ($wrongType -eq 0) "$wrongType controle(s) com tipo diferente de figura"
          $uniqueTags = @($pictureControls.ToArray() | ForEach-Object { [string]$_.Tag } | Select-Object -Unique)
          Add-Check $kind 'ids-campos-print' ($uniqueTags.Count -eq $expectedFields) "$($uniqueTags.Count) tag(s) única(s)"
          $missingExpectedTags = 0
          $fallbackIndex = 0
          foreach ($section in $content.it.secoes) {
            $fallbackIndex++
            if (-not [bool]$section.campo_print.incluir) { continue }
            $controlId = ([string]$section.campo_print.id).Trim() -replace '^PRINT-', '' -replace '[^A-Za-z0-9_-]+', '-'
            $controlId = $controlId.Trim('-')
            if ([string]::IsNullOrWhiteSpace($controlId)) { $controlId = $fallbackIndex.ToString('00') }
            if ($controlId.Length -gt 55) { $controlId = $controlId.Substring(0, 55) }
            if ($uniqueTags -notcontains ('PRINT-' + $controlId)) { $missingExpectedTags++ }
          }
          Add-Check $kind 'referencias-campos-print' ($missingExpectedTags -eq 0) "$missingExpectedTags tag(s) sem correspondência com a etapa"
          $invalidBoxes = 0
          foreach ($control in $pictureControls) {
            try {
              if ($control.Range.Tables.Count -lt 1) { $invalidBoxes++; continue }
              $boxTable = $control.Range.Tables.Item(1)
              if ($control.Range.InlineShapes.Count -lt 1) { $invalidBoxes++; continue }
              $placeholderShape = $control.Range.InlineShapes.Item(1)
              # O Word não retorna Width/Height das células de uma tabela
              # aninhada de forma confiável via COM. A caixa usa padding de
              # 6 pt em cada lado, então o tamanho externo é o shape + 12 pt.
              $boxWidth = [double]$placeholderShape.Width + 12.0
              $boxHeight = [double]$placeholderShape.Height + 12.0
              $ratio = if ($boxHeight -gt 0) { $boxWidth / $boxHeight } else { 0 }
              $borderOk = $true
              foreach ($borderType in @(-1, -2, -3, -4)) {
                if ($boxTable.Borders.Item($borderType).LineStyle -eq 0) { $borderOk = $false }
              }
              if ([Math]::Abs($ratio - (16.0 / 9.0)) -gt 0.08 -or -not $borderOk) { $invalidBoxes++ }
            } catch { $invalidBoxes++ }
          }
          Add-Check $kind 'caixas-print-16x9' ($invalidBoxes -eq 0) "$invalidBoxes campo(s) sem caixa 16:9 com borda"
          if ($RequireFilledPrints) {
            $empty = @($pictureControls.ToArray() | Where-Object { $_.ShowingPlaceholderText }).Count
            Add-Check $kind 'prints-preenchidos' ($empty -eq 0) "$empty campo(s) ainda vazio(s)"
          }

          $bodyImages = 0
          foreach ($shape in $doc.InlineShapes) {
            if ($shape.Range.StoryType -ne 1) { continue }
            $bodyImages++
          }
          $placeholderImages = 0
          foreach ($control in $pictureControls) { $placeholderImages += $control.Range.InlineShapes.Count }
          $uncontrolledImages = [Math]::Max(0, $bodyImages - $placeholderImages)
          Add-Check $kind 'sem-prints-automaticos' ($uncontrolledImages -eq 0) "$uncontrolledImages imagem(ns) fora dos campos manuais"
          foreach ($forbidden in @('PÚBLICO-ALVO:', 'QUANDO USAR:', 'OBJETIVO DA ETAPA:', 'RESULTADO DA ETAPA:')) {
            Add-Check $kind ("sem-bloco-" + ($forbidden -replace '[^A-ZÁÉÍÓÚÃÕÇ]', '-')) (-not $fullText.Contains($forbidden)) $forbidden
          }
          foreach ($section in $content.it.secoes) {
            Add-Check $kind ("secao-" + [string]$section.id) ($fullText.Contains((Normalize-Text ([string]$section.titulo)))) ([string]$section.titulo)
            foreach ($instruction in $section.instrucoes) {
              Add-Check $kind ("instrucao-" + [string]$section.id) ($fullText.Contains((Normalize-Text ([string]$instruction)))) ([string]$instruction)
            }
          }
        }
      } finally {
        if ($null -ne $doc) {
          $doc.Close($false)
          [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc)
        }
      }
    }
  } catch {
    Add-Check 'word' 'automacao-office' $false $_.Exception.Message
  } finally {
    if ($null -ne $word) {
      $word.Quit()
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
  }
}

function Get-WorkbookText {
  param($Workbook)
  $builder = New-Object System.Text.StringBuilder
  foreach ($sheet in $Workbook.Worksheets) {
    if ($sheet.Visible -eq -1) {
      [void]$builder.AppendLine([string]$sheet.UsedRange.Text)
      $values = $sheet.UsedRange.Value2
      if ($values -is [System.Array]) {
        foreach ($value in $values) { if ($null -ne $value) { [void]$builder.AppendLine([string]$value) } }
      } elseif ($null -ne $values) {
        [void]$builder.AppendLine([string]$values)
      }
    }
  }
  return $builder.ToString()
}

function Get-DefinedRange {
  param($Workbook, [string]$Name)
  try { return $Workbook.Names.Item($Name).RefersToRange } catch { return $null }
}

function Count-BlankCells {
  param($Range)
  if ($null -eq $Range) { return -1 }
  $blank = 0
  foreach ($cell in $Range.Cells) {
    if ([string]::IsNullOrWhiteSpace([string]$cell.Value2)) { $blank++ }
  }
  return $blank
}

function Validate-ExcelDocuments {
  param([string[]]$RequestedTypes)

  $excel = $null
  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false

    foreach ($kind in $RequestedTypes) {
      if ($kind -notin @('form', 'mp')) { continue }
      $fileName = if ($kind -eq 'form') { [string]$content.saida.arquivo_form } else { [string]$content.saida.arquivo_mp }
      $path = Join-Path $outputPath $fileName
      Add-Check $kind 'arquivo-existe' (Test-Path -LiteralPath $path -PathType Leaf) $fileName
      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }

      $workbook = $null
      try {
        $workbook = $excel.Workbooks.Open($path, 0, $true)
        $sheetName = if ($kind -eq 'form') { 'FORM' } else { 'MP' }
        $sheet = $null
        try { $sheet = $workbook.Worksheets.Item($sheetName) } catch { }
        Add-Check $kind 'aba-principal' ($null -ne $sheet) $sheetName
        if ($null -eq $sheet) { continue }

        $text = Normalize-Text (Get-WorkbookText $workbook)
        Add-Check $kind 'titulo' ($text.Contains((Normalize-Text ([string]$content.documento.titulo)))) ([string]$content.documento.titulo)
        Add-Check $kind 'impressao-largura' ($sheet.PageSetup.FitToPagesWide -eq 1) "FitToPagesWide=$($sheet.PageSetup.FitToPagesWide)"
        Add-Check $kind 'impressao-altura-automatica' ($sheet.PageSetup.FitToPagesTall -in @(0, $false)) "FitToPagesTall=$($sheet.PageSetup.FitToPagesTall)"
        Add-Check $kind 'sem-erros-formula' (-not ($text -match '#(DIV/0|REF|VALUE|N/A|NAME)')) 'Sem erros visíveis de fórmula'
        Add-Check $kind 'planilha-protegida' ([bool]$sheet.ProtectContents) "ProtectContents=$($sheet.ProtectContents)"
        Add-Check $kind 'sem-abas-residuais' ($workbook.Worksheets.Count -eq 1) "$($workbook.Worksheets.Count) aba(s)"
        $linkSources = $null
        try { $linkSources = $workbook.LinkSources(1) } catch { }
        Add-Check $kind 'sem-vinculos-externos' ($null -eq $linkSources) 'Nenhum vínculo Excel externo'
        $conditionalFormatCells = 0
        foreach ($cell in $sheet.UsedRange.Cells) {
          try { if ($cell.FormatConditions.Count -gt 0) { $conditionalFormatCells++ } } catch { }
        }
        Add-Check $kind 'formatacao-condicional' ($conditionalFormatCells -gt 0) "$conditionalFormatCells célula(s) com regra"

        if ($kind -eq 'form') {
          $responses = Get-DefinedRange $workbook 'FORM_RESPOSTAS'
          $opinions = Get-DefinedRange $workbook 'FORM_PARECERES'
          $coefficients = Get-DefinedRange $workbook 'FORM_COEFICIENTES'
          Add-Check $kind 'range-respostas' ($null -ne $responses) 'FORM_RESPOSTAS'
          Add-Check $kind 'range-pareceres' ($null -ne $opinions) 'FORM_PARECERES'
          Add-Check $kind 'range-coeficientes' ($null -ne $coefficients) 'FORM_COEFICIENTES'
          if ($null -ne $responses) {
            $blankResponses = Count-BlankCells $responses
            Add-Check $kind 'respostas-iniciais-vazias' ($blankResponses -eq $responses.Cells.Count) "$blankResponses/$($responses.Cells.Count) vazias"
          }
          $expectedQuestions = 0
          foreach ($block in $content.form.blocos) { $expectedQuestions += @($block.itens).Count }
          $listValidationCount = 0
          $unlockedInputCount = 0
          foreach ($cell in $sheet.UsedRange.Cells) {
            try {
              if ($cell.Validation.Type -eq 3) {
                $listValidationCount++
                if (-not [bool]$cell.Locked) { $unlockedInputCount++ }
              }
            } catch { }
          }
          Add-Check $kind 'validacao-sim-nao' ($listValidationCount -eq $expectedQuestions) "$listValidationCount lista(s), $expectedQuestions esperada(s)"
          Add-Check $kind 'entradas-desbloqueadas' ($unlockedInputCount -eq $listValidationCount) "$unlockedInputCount/$listValidationCount desbloqueada(s)"
          $contextInputsUnlocked = (-not [bool]$sheet.Range('B5').Locked) -and (-not [bool]$sheet.Range('F5').Locked) -and (-not [bool]$sheet.Range('B6').Locked)
          Add-Check $kind 'contexto-desbloqueado' $contextInputsUnlocked 'Cliente, prazo e contexto são editáveis'
          $formulaRangesOk = $true
          foreach ($formulaRange in @($opinions, $coefficients)) {
            if ($null -eq $formulaRange) { $formulaRangesOk = $false; continue }
            foreach ($cell in $formulaRange.Cells) {
              if (-not [bool]$cell.HasFormula -or -not [bool]$cell.Locked) { $formulaRangesOk = $false }
            }
          }
          Add-Check $kind 'formulas-protegidas' $formulaRangesOk 'Pareceres e coeficientes calculados em células bloqueadas'
          $initialOpinion = Normalize-Text ([string]$sheet.Range('B9').Value2)
          $initialCoefficient = [string]$sheet.Range('H9').Value2
          Add-Check $kind 'parecer-inicial-pendente' ($initialOpinion -eq 'PENDENTE') "Parecer=$initialOpinion"
          Add-Check $kind 'percentual-inicial-vazio' ([string]::IsNullOrWhiteSpace($initialCoefficient)) "Percentual=$initialCoefficient"
          Add-Check $kind 'campo-evidencia' ($text.Contains('EVIDÊNCIA/PRINT')) 'EVIDÊNCIA/PRINT — INSERÇÃO MANUAL'
          foreach ($block in $content.form.blocos) {
            foreach ($item in $block.itens) {
              Add-Check $kind ("pergunta-" + [string]$block.id + '-' + [string]$item.id) ($text.Contains((Normalize-Text ([string]$item.pergunta)))) ([string]$item.pergunta)
            }
          }
        } else {
          $probability = Get-DefinedRange $workbook 'MP_PROBABILIDADE'
          $severity = Get-DefinedRange $workbook 'MP_GRAVIDADE'
          $score = Get-DefinedRange $workbook 'MP_SCORE'
          Add-Check $kind 'range-probabilidade' ($null -ne $probability) 'MP_PROBABILIDADE'
          Add-Check $kind 'range-gravidade' ($null -ne $severity) 'MP_GRAVIDADE'
          Add-Check $kind 'range-score' ($null -ne $score) 'MP_SCORE'
          if ($null -ne $probability) {
            $blankP = Count-BlankCells $probability
            Add-Check $kind 'probabilidade-inicial-vazia' ($blankP -eq $probability.Cells.Count) "$blankP/$($probability.Cells.Count) vazias"
          }
          if ($null -ne $severity) {
            $blankG = Count-BlankCells $severity
            Add-Check $kind 'gravidade-inicial-vazia' ($blankG -eq $severity.Cells.Count) "$blankG/$($severity.Cells.Count) vazias"
          }
          $expectedRisks = @($content.mp.riscos).Count
          $riskRangesOk = ($null -ne $probability -and $null -ne $severity -and $null -ne $score -and
            $probability.Cells.Count -eq $expectedRisks -and $severity.Cells.Count -eq $expectedRisks -and $score.Cells.Count -eq $expectedRisks)
          Add-Check $kind 'quantidade-riscos' $riskRangesOk "$expectedRisks risco(s) esperado(s)"
          $riskInputsOk = $true
          foreach ($inputRange in @($probability, $severity)) {
            if ($null -eq $inputRange) { $riskInputsOk = $false; continue }
            foreach ($cell in $inputRange.Cells) {
              try {
                if ($cell.Validation.Type -ne 1 -or [bool]$cell.Locked) { $riskInputsOk = $false }
              } catch { $riskInputsOk = $false }
            }
          }
          Add-Check $kind 'entradas-pg' $riskInputsOk 'P/G com validação inteira 1–5 e células desbloqueadas'
          $riskFormulaOk = $true
          if ($null -eq $score) {
            $riskFormulaOk = $false
          } else {
            foreach ($scoreCell in $score.Cells) {
              $classificationCell = $scoreCell.Offset(0, 1)
              $classificationFormula = Normalize-Text ([string]$classificationCell.Formula)
              if (-not [bool]$scoreCell.HasFormula -or -not [bool]$scoreCell.Locked -or
                  -not [string]::IsNullOrWhiteSpace([string]$scoreCell.Value2) -or
                  -not [bool]$classificationCell.HasFormula -or
                  -not ($classificationFormula.Contains('<=4') -and $classificationFormula.Contains('<=10') -and $classificationFormula.Contains('ALARP'))) {
                $riskFormulaOk = $false
              }
            }
          }
          Add-Check $kind 'formula-risco' $riskFormulaOk 'P×G vazio até P/G e escala 1–4, 5–10, 12+'
          $suggestedCount = @($content.mp.riscos | Where-Object { $_.sugerido }).Count
          Add-Check $kind 'riscos-sugeridos-destacados' ($suggestedCount -eq 0 -or $text.Contains('RISCO SUGERIDO')) "$suggestedCount risco(s) sugerido(s)"
          foreach ($chainName in @('fornecedores', 'entradas', 'clientes', 'saidas')) {
            foreach ($chainItem in (ConvertTo-StringArray (Get-PropertyValue $content.mp.cadeia $chainName @()))) {
              Add-Check $kind ("cadeia-$chainName") ($text.Contains((Normalize-Text $chainItem))) $chainItem
            }
          }
          foreach ($step in $content.pop.etapas) {
            Add-Check $kind ("fluxo-" + [string]$step.id) ($text.Contains((Normalize-Text ([string]$step.o_que)))) ([string]$step.o_que)
          }
          foreach ($stale in @('ISCMSP', 'CENTRO CIRÚRGICO', 'SETOR HOSPITALAR', 'THABATA ARAÚJO')) {
            Add-Check $kind ("sem-residuo-" + ($stale -replace '\s+', '-')) (-not $text.Contains($stale)) $stale
          }
        }
      } finally {
        if ($null -ne $workbook) {
          $workbook.Close($false)
          [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($workbook)
        }
      }
    }
  } catch {
    Add-Check 'excel' 'automacao-office' $false $_.Exception.Message
  } finally {
    if ($null -ne $excel) {
      $excel.Quit()
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
  }
}

Validate-WordDocuments $types
Validate-ExcelDocuments $types

if ([string]::IsNullOrWhiteSpace($ReportPath)) { $ReportPath = Join-Path $outputPath 'relatorio-validacao.md' }
$report = Get-FullPath $ReportPath
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Relatório de validação')
$lines.Add('')
$failures = @($checks.ToArray() | Where-Object { -not $_.Ok })
$resultLabel = if ($failures.Count -eq 0) { 'APROVADO' } else { 'REPROVADO' }
$lines.Add("- Resultado: $resultLabel")
$lines.Add("- Documentos: " + (($types | ForEach-Object { $_.ToUpperInvariant() }) -join ', '))
$lines.Add("- Verificações: $($checks.Count - $failures.Count)/$($checks.Count) aprovadas")
$lines.Add('')
$lines.Add('## Resumo')
$lines.Add('')
foreach ($group in ($checks.ToArray() | Group-Object Document)) {
  $groupFailures = @($group.Group | Where-Object { -not $_.Ok }).Count
  $lines.Add("- $($group.Name.ToUpperInvariant()): $($group.Count - $groupFailures)/$($group.Count) verificações aprovadas")
}
if ($failures.Count -gt 0) {
  $lines.Add('')
  $lines.Add('## Falhas')
  $lines.Add('')
  foreach ($failure in $failures) {
    $lines.Add("- $($failure.Document.ToUpperInvariant()) — $($failure.Name): $($failure.Detail)")
  }
}
[System.IO.File]::WriteAllLines($report, $lines.ToArray(), (New-Object System.Text.UTF8Encoding($true)))

Write-Output "Relatório: $report"
if ($failures.Count -gt 0) {
  foreach ($failure in $failures) { Write-Error "$($failure.Document)/$($failure.Name): $($failure.Detail)" }
  exit 1
}
exit 0
