[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [Alias("ContentPath", "JsonPath")]
  [string]$ContentJson,

  [Parameter(Mandatory = $true, Position = 1)]
  [Alias("StagingDir")]
  [string]$OutputDir,

  [Parameter(Position = 2)]
  [Alias("Types", "Tipos", "RequestedDocuments")]
  [string[]]$DocumentTypes = @()
)

$ErrorActionPreference = "Stop"
$wdCollapseEnd = 0
$wdCollapseStart = 1
$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdRowHeightExactly = 2
$wdCellAlignVerticalCenter = 1
$wdContentControlPicture = 2
$wdPreferredWidthPoints = 3
$wdAutoFitFixed = 0
$wdLineStyleSingle = 1
$wdBorderTop = -1
$wdBorderLeft = -2
$wdBorderBottom = -3
$wdBorderRight = -4

function Decode-JsonString([string]$Value) {
  return ConvertFrom-Json -InputObject ('"' + $Value + '"')
}

function Repair-Utf8Mojibake([string]$Text) {
  if ([string]::IsNullOrEmpty($Text)) { return $Text }
  # UTF-8 lido como Latin-1/Windows-1252: "ção" vira "Ã§Ã£o"
  if ($Text -notmatch 'Ã.|Â[\x80-\xBF]') { return $Text }
  try {
    $latin1 = [System.Text.Encoding]::GetEncoding(28591)
    $repaired = [System.Text.Encoding]::UTF8.GetString($latin1.GetBytes($Text))
    $badBefore = ([regex]::Matches($Text, 'Ã')).Count
    $badAfter = ([regex]::Matches($repaired, 'Ã')).Count
    if ($badAfter -lt $badBefore) { return $repaired }
  } catch {
  }
  return $Text
}

$Labels = @{
  Codigo = Decode-JsonString 'C\u00f3digo'
  Emissao = Decode-JsonString 'Emiss\u00e3o'
  Revisao = Decode-JsonString 'Revis\u00e3o'
  Versao = Decode-JsonString 'Vers\u00e3o'
  Pagina = Decode-JsonString 'P\u00e1gina'
  InstrucaoTrabalho = Decode-JsonString 'INSTRU\u00c7\u00c3O DE TRABALHO'
  TituloDocumento = Decode-JsonString 'T\u00cdTULO DO DOCUMENTO:'
  ObjetivoDocumento = 'OBJETIVO DO DOCUMENTO:'
  Definicoes = Decode-JsonString 'ABREVIATURAS ADOTADAS E DEFINI\u00c7\u00d5ES:'
  Documentacao = Decode-JsonString 'DOCUMENTA\u00c7\u00c3O COMPLEMENTAR AFILIADA AO DOCUMENTO:'
  Caminho = 'Caminho'
  Atencao = Decode-JsonString 'ATEN\u00c7\u00c3O:'
  EvidenciaManual = Decode-JsonString 'EVID\u00caNCIA/PRINT \u2014 INSER\u00c7\u00c3O MANUAL'
  Orientacao = Decode-JsonString 'Orienta\u00e7\u00e3o'
  Obrigatorio = Decode-JsonString 'OBRIGAT\u00d3RIO'
  DefaultPrintInstruction = Decode-JsonString 'Clique no controle de imagem e selecione o print da tela correspondente a esta etapa.'
  DefaultImage = 'Imagem'
}

function Get-FullPath([string]$PathValue) {
  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    throw "O caminho informado nao pode ficar vazio."
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Get-PropertyValue($Object, [string]$Name) {
  if ($null -eq $Object) {
    return $null
  }

  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $null
  }

  return $property.Value
}

function Get-FirstPropertyValue($Object, [string[]]$Names) {
  foreach ($name in $Names) {
    $value = Get-PropertyValue $Object $name
    if ($null -eq $value) {
      continue
    }
    if ($value -is [string] -and [string]::IsNullOrWhiteSpace($value)) {
      continue
    }
    return $value
  }
  return $null
}

function Get-TextValue($Object, [string[]]$Names, [string]$DefaultValue = "") {
  $value = Get-FirstPropertyValue $Object $Names
  if ($null -eq $value) {
    return $DefaultValue
  }
  return (Repair-Utf8Mojibake (([string]$value).Trim()))
}

function Test-BooleanValue($Value) {
  if ($Value -is [bool]) {
    return $Value
  }
  if ($null -eq $Value) {
    return $false
  }

  $normalized = ([string]$Value).Trim().ToUpperInvariant()
  return $normalized -in @("1", "TRUE", "SIM", "YES", "Y")
}

function ConvertTo-StringItems($Value) {
  $items = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Value) {
    return $items.ToArray()
  }

  if ($Value -is [string]) {
    if (-not [string]::IsNullOrWhiteSpace($Value)) {
      $items.Add($Value.Trim())
    }
    return $items.ToArray()
  }

  foreach ($item in @($Value)) {
    if ($null -ne $item -and -not [string]::IsNullOrWhiteSpace([string]$item)) {
      $items.Add(([string]$item).Trim())
    }
  }
  return $items.ToArray()
}

function Get-SelectedWordTypes($Content, [string[]]$ExplicitTypes) {
  $sourceTypes = @($ExplicitTypes)
  if ($sourceTypes.Count -eq 0) {
    $sourceTypes = @(Get-PropertyValue $Content "documentos_solicitados")
  }

  $selected = New-Object System.Collections.Generic.List[string]
  foreach ($sourceType in $sourceTypes) {
    foreach ($token in (([string]$sourceType) -split '[,;|]')) {
      $kind = $token.Trim().ToUpperInvariant()
      switch -Regex ($kind) {
        '^(POP|PR|POP/PR|PR/POP)$' {
          if (-not $selected.Contains("POP")) { $selected.Add("POP") }
          continue
        }
        '^(IT|IN|IT/IN|IN/IT)$' {
          if (-not $selected.Contains("IT")) { $selected.Add("IT") }
          continue
        }
        '^(FORM|MP)$' { continue }
        '^$' { continue }
        default { throw "Tipo de documento desconhecido para o gerador Word: $token" }
      }
    }
  }

  return $selected.ToArray()
}

function Get-DocumentMetadata($Content) {
  $metadata = Get-FirstPropertyValue $Content @("documento", "metadados")
  if ($null -eq $metadata) {
    throw "O JSON nao contem o objeto 'documento'."
  }
  return $metadata
}

function Get-DocumentCode($Content, $Metadata, [string]$Kind) {
  if ($Kind -eq "POP") {
    $direct = Get-TextValue $Metadata @("codigo_pop", "codigo_pr")
    $aliases = @("pop", "pr", "codigo_pop", "codigo_pr")
  } else {
    $direct = Get-TextValue $Metadata @("codigo_it", "codigo_in")
    $aliases = @("it", "in", "codigo_it", "codigo_in")
  }
  if (-not [string]::IsNullOrWhiteSpace($direct)) {
    return $direct
  }

  foreach ($codesObject in @(
    (Get-PropertyValue $Metadata "codigos"),
    (Get-PropertyValue $Content "codigos")
  )) {
    $candidate = Get-TextValue $codesObject $aliases
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }
  return ""
}

function ConvertTo-SafeFileStem([string]$Value) {
  $result = $Value.Trim()
  foreach ($invalidCharacter in [System.IO.Path]::GetInvalidFileNameChars()) {
    $result = $result.Replace([string]$invalidCharacter, "-")
  }
  $result = ($result -replace '\s+', ' ').Trim(' ', '.')
  if ([string]::IsNullOrWhiteSpace($result)) {
    return "documento"
  }
  return $result
}

function Resolve-OutputFileName($Content, $Metadata, [string]$Kind) {
  $output = Get-FirstPropertyValue $Content @("saida", "nomes_saida")
  if ($Kind -eq "POP") {
    $names = @("arquivo_pop", "arquivo_pr", "pop", "pr")
  } else {
    $names = @("arquivo_it", "arquivo_in", "it", "in")
  }

  $fileName = Get-TextValue $output $names
  if ([string]::IsNullOrWhiteSpace($fileName)) {
    $code = Get-DocumentCode $Content $Metadata $Kind
    $title = Get-TextValue $Metadata @("titulo") "Documento"
    $prefix = $(if ($Kind -eq "POP") { "PR" } else { "IN" })
    if (-not [string]::IsNullOrWhiteSpace($code)) {
      $prefix = $code
    }
    $fileName = (ConvertTo-SafeFileStem ($prefix + " - " + $title)) + ".docx"
  }

  if ([System.IO.Path]::IsPathRooted($fileName) -or
      [System.IO.Path]::GetFileName($fileName) -ne $fileName -or
      [System.IO.Path]::GetExtension($fileName) -ine ".docx") {
    throw "Nome de saida invalido para ${Kind}: $fileName"
  }
  return $fileName
}

function Set-CellText($Cell, [string]$Text) {
  $range = $Cell.Range
  $range.End = $range.End - 1
  $range.Text = (Repair-Utf8Mojibake $Text)
}

function Join-DisplayLines($Value) {
  $items = @(ConvertTo-StringItems $Value)
  if ($items.Count -eq 0) {
    return ""
  }
  return ($items -join "`r")
}

function Replace-AllStories($Doc, [string]$FindText, [string]$ReplaceText) {
  if ([string]::IsNullOrEmpty($FindText)) {
    return
  }

  foreach ($story in $Doc.StoryRanges) {
    $range = $story
    while ($null -ne $range) {
      $find = $range.Find
      $find.ClearFormatting()
      $find.Replacement.ClearFormatting()
      [void]$find.Execute(
        $FindText,
        $false,
        $false,
        $false,
        $false,
        $false,
        $true,
        1,
        $false,
        $ReplaceText,
        2
      )
      $range = $range.NextStoryRange
    }
  }
}

function Set-PageFields($Word, $Doc) {
  $pagePrefix = $Labels.Pagina + ": "
  $patterns = @(
    $pagePrefix + "1 de 1",
    $pagePrefix + "2 de 2"
  )

  foreach ($story in $Doc.StoryRanges) {
    $range = $story
    while ($null -ne $range) {
      foreach ($pattern in $patterns) {
        $search = $range.Duplicate
        $find = $search.Find
        $find.ClearFormatting()
        if ($find.Execute($pattern)) {
          $search.Select()
          $selection = $Word.Selection
          $selection.TypeText($pagePrefix)
          [void]$selection.Fields.Add($selection.Range, -1, "PAGE", $true)
          [void]$selection.EndKey(1)
          $selection.TypeText(" de ")
          [void]$selection.Fields.Add($selection.Range, -1, "NUMPAGES", $true)
          [void]$selection.EndKey(1)
        }
      }
      $range = $range.NextStoryRange
    }
  }
}

function Update-AllFields($Doc) {
  [void]$Doc.Fields.Update()
  foreach ($section in $Doc.Sections) {
    foreach ($header in $section.Headers) {
      if ($header.Exists) {
        [void]$header.Range.Fields.Update()
      }
    }
    foreach ($footer in $section.Footers) {
      if ($footer.Exists) {
        [void]$footer.Range.Fields.Update()
      }
    }
  }
}

function Reset-TableRows($Table, [int]$KeepRows) {
  for ($index = $Table.Rows.Count; $index -gt $KeepRows; $index--) {
    $Table.Rows.Item($index).Delete()
  }
}

function Write-Revisions($Table, $Revisions) {
  Reset-TableRows $Table 2
  foreach ($revision in @($Revisions)) {
    if ($null -eq $revision) {
      continue
    }
    $row = $Table.Rows.Add()
    Set-CellText $row.Cells.Item(1) (Get-TextValue $revision @("numero", "versao"))
    Set-CellText $row.Cells.Item(2) (Get-TextValue $revision @("alteracao", "descricao"))
  }
}

function Set-HeaderLogo($Doc, [string]$LogoFile) {
  if (-not (Test-Path -LiteralPath $LogoFile -PathType Leaf)) {
    throw "Logo interno nao localizado: $LogoFile"
  }

  foreach ($section in $Doc.Sections) {
    foreach ($header in $section.Headers) {
      if (-not $header.Exists -or $header.Range.Tables.Count -lt 1) {
        continue
      }

      for ($index = $header.Shapes.Count; $index -ge 1; $index--) {
        $header.Shapes.Item($index).Delete()
      }

      $cell = $header.Range.Tables.Item(1).Cell(1, 1)
      for ($index = $cell.Range.InlineShapes.Count; $index -ge 1; $index--) {
        $cell.Range.InlineShapes.Item($index).Delete()
      }

      $cell.VerticalAlignment = $wdCellAlignVerticalCenter
      $range = $cell.Range
      $range.End = $range.End - 1
      $range.Text = ""
      $range = $cell.Range
      $range.End = $range.End - 1
      $range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
      $logo = $range.InlineShapes.AddPicture($LogoFile, $false, $true)
      $logo.LockAspectRatio = -1
      $logo.Width = 96
    }
  }
}

function Apply-HeaderFooter($Doc, $Content, $Metadata, [string]$Kind, [string]$LogoFile) {
  if ($Kind -eq "POP") {
    Replace-AllStories $Doc "MODELO DE PROCEDIMENTO" "PROCEDIMENTO"
    $templateCode = "PR.QUA.001"
  } else {
    Replace-AllStories $Doc ("MODELO DE " + $Labels.InstrucaoTrabalho) $Labels.InstrucaoTrabalho
    $templateCode = "IN.QUA.001"
  }

  $code = Get-DocumentCode $Content $Metadata $Kind
  Replace-AllStories $Doc ($Labels.Codigo + ": " + $templateCode) ($Labels.Codigo + ": " + $code)
  Replace-AllStories $Doc ($Labels.Emissao + ": 11/08/2022") ($Labels.Emissao + ": " + (Get-TextValue $Metadata @("emissao")))
  Replace-AllStories $Doc ($Labels.Revisao + ": 02/10/2024") ($Labels.Revisao + ": " + (Get-TextValue $Metadata @("revisao")))
  Replace-AllStories $Doc ($Labels.Versao + ": 02") ($Labels.Versao + ": " + (Get-TextValue $Metadata @("versao")))

  $elaborador = Get-TextValue $Metadata @("elaborador")
  $verificador = Get-TextValue $Metadata @("verificador")
  $aprovador = Get-TextValue $Metadata @("aprovador")
  Replace-AllStories $Doc "#Nome Elaborador#" $elaborador
  Replace-AllStories $Doc "#Nome Verificador#" $verificador
  Replace-AllStories $Doc "#Nome Colaborador#" $elaborador
  Replace-AllStories $Doc "#Nome Coordenador#" $verificador
  Replace-AllStories $Doc "#Nome Gestor#" $aprovador
  Set-HeaderLogo $Doc $LogoFile
}

function Set-OpeningTables($Doc, $Content, $Metadata) {
  if ($Doc.Tables.Count -lt 6) {
    throw "O modelo Word nao contem as seis tabelas obrigatorias."
  }

  Set-CellText $Doc.Tables.Item(1).Cell(1, 1) ($Labels.TituloDocumento + "`r" + (Get-TextValue $Metadata @("titulo")))
  Set-CellText $Doc.Tables.Item(2).Cell(1, 1) ($Labels.ObjetivoDocumento + "`r" + (Get-TextValue $Metadata @("objetivo")))
  Set-CellText $Doc.Tables.Item(3).Cell(1, 1) ($Labels.Definicoes + "`r" + (Join-DisplayLines (Get-PropertyValue $Content "abreviaturas")))
  Set-CellText $Doc.Tables.Item(4).Cell(1, 1) ($Labels.Documentacao + "`r" + (Join-DisplayLines (Get-PropertyValue $Content "documentacao_complementar")))
}

function Close-WordDocument($Doc) {
  if ($null -eq $Doc) {
    return
  }
  try {
    $Doc.Close($false)
  } finally {
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($Doc)
  }
}

function Build-PopDocument($Word, $Content, $Metadata, [string]$TemplatePath, [string]$OutputPath, [string]$LogoFile) {
  $pop = Get-PropertyValue $Content "pop"
  $steps = @(Get-PropertyValue $pop "etapas")
  if ($steps.Count -eq 0) {
    throw "O JSON nao contem etapas em 'pop.etapas'."
  }

  Copy-Item -LiteralPath $TemplatePath -Destination $OutputPath -Force
  $doc = $null
  try {
    $doc = $Word.Documents.Open($OutputPath, $false, $false)
    Apply-HeaderFooter $doc $Content $Metadata "POP" $LogoFile
    Set-OpeningTables $doc $Content $Metadata

    $procedureTable = $doc.Tables.Item(5)
    $revisionTable = $doc.Tables.Item(6)
    Reset-TableRows $procedureTable 1
    foreach ($step in $steps) {
      if ($null -eq $step) {
        continue
      }
      $row = $procedureTable.Rows.Add()
      Set-CellText $row.Cells.Item(1) (Get-TextValue $step @("o_que"))
      Set-CellText $row.Cells.Item(2) (Get-TextValue $step @("como"))
      Set-CellText $row.Cells.Item(3) (Get-TextValue $step @("setor"))
      Set-CellText $row.Cells.Item(4) (Get-TextValue $step @("registro"))
    }

    Write-Revisions $revisionTable (Get-PropertyValue $Content "revisoes")
    Set-PageFields $Word $doc
    $doc.Repaginate()
    Update-AllFields $doc
    $doc.Save()
  } finally {
    Close-WordDocument $doc
  }
}

function Type-Paragraph($Selection, [string]$Text, [bool]$Bold = $false, [bool]$Italic = $false, [int]$Alignment = 0) {
  $Selection.Font.Bold = $(if ($Bold) { 1 } else { 0 })
  $Selection.Font.Italic = $(if ($Italic) { 1 } else { 0 })
  $Selection.ParagraphFormat.Alignment = $Alignment
  $Selection.TypeText((Repair-Utf8Mojibake $Text))
  $Selection.TypeParagraph()
  $Selection.Font.Bold = 0
  $Selection.Font.Italic = 0
  $Selection.ParagraphFormat.Alignment = $wdAlignParagraphLeft
}

function Type-LabeledParagraph($Selection, [string]$Label, [string]$Text) {
  $Selection.Font.Bold = 1
  $Selection.TypeText((Repair-Utf8Mojibake $Label) + ": ")
  $Selection.Font.Bold = 0
  $Selection.TypeText((Repair-Utf8Mojibake $Text))
  $Selection.TypeParagraph()
}

function Normalize-InstructionText([string]$Text) {
  $singleLine = ($Text -replace '[\r\n]+', ' ').Trim()
  return ($singleLine -replace '^\s*\d+\s*[\.\)\-:]\s*', '').Trim()
}

function ConvertTo-ContentControlId([string]$Value, [int]$FallbackIndex) {
  $identifier = $Value.Trim()
  if ([string]::IsNullOrWhiteSpace($identifier)) {
    $identifier = $FallbackIndex.ToString("00")
  }
  $identifier = ($identifier -replace '^PRINT-', '')
  $identifier = ($identifier -replace '[^A-Za-z0-9_-]+', '-')
  $identifier = $identifier.Trim('-')
  if ([string]::IsNullOrWhiteSpace($identifier)) {
    $identifier = $FallbackIndex.ToString("00")
  }
  if ($identifier.Length -gt 55) {
    $identifier = $identifier.Substring(0, 55)
  }
  return $identifier
}

function Add-PictureContentControl($Doc, $DetailCell, $Placeholder) {
  $searchRange = $DetailCell.Range.Duplicate
  $searchRange.End = $searchRange.End - 1
  $find = $searchRange.Find
  $find.ClearFormatting()
  $find.Text = $Placeholder.token
  $find.Forward = $true
  $find.Wrap = 0
  $find.MatchWildcards = $false
  if (-not $find.Execute()) {
    throw "Marcador interno do campo de print nao localizado: $($Placeholder.tag)"
  }

  $searchRange.Text = ""
  $searchRange.Collapse($wdCollapseStart)
  $placeholderTable = $Doc.Tables.Add($searchRange, 1, 1)

  $availableWidth = [double]$DetailCell.Width - 12.0
  $boxWidth = [Math]::Min(432.0, $availableWidth)
  if ($boxWidth -lt 288.0) {
    $boxWidth = $availableWidth
  }
  $boxHeight = $boxWidth * 9.0 / 16.0
  $innerWidth = [Math]::Max(36.0, $boxWidth - 12.0)
  $innerHeight = [Math]::Max(20.25, $boxHeight - 12.0)

  $placeholderTable.AllowAutoFit = $false
  $placeholderTable.PreferredWidthType = $wdPreferredWidthPoints
  $placeholderTable.PreferredWidth = $boxWidth
  $placeholderTable.Columns.Item(1).SetWidth($boxWidth, $wdAutoFitFixed)
  $placeholderTable.Rows.Alignment = $wdAlignParagraphCenter
  $placeholderTable.Rows.AllowBreakAcrossPages = 0
  $placeholderTable.TopPadding = 6
  $placeholderTable.BottomPadding = 6
  $placeholderTable.LeftPadding = 6
  $placeholderTable.RightPadding = 6
  foreach ($borderType in @($wdBorderTop, $wdBorderLeft, $wdBorderBottom, $wdBorderRight)) {
    $border = $placeholderTable.Borders.Item($borderType)
    $border.LineStyle = $wdLineStyleSingle
    $border.LineWidth = 12
    $border.Color = 8421504
  }

  $pictureCell = $placeholderTable.Cell(1, 1)
  $pictureCell.VerticalAlignment = $wdCellAlignVerticalCenter
  $pictureRange = $pictureCell.Range.Duplicate
  $pictureRange.End = $pictureRange.End - 1
  $pictureRange.Text = ""
  $pictureRange = $pictureCell.Range.Duplicate
  $pictureRange.End = $pictureRange.End - 1
  $pictureRange.Collapse($wdCollapseStart)

  $control = $Doc.ContentControls.Add($wdContentControlPicture, $pictureRange)
  $control.Tag = $Placeholder.tag
  $control.Title = $Placeholder.title
  $control.LockContentControl = $false
  $control.LockContents = $false
  $control.Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
  if ($control.Range.InlineShapes.Count -gt 0) {
    $shape = $control.Range.InlineShapes.Item(1)
    $shape.LockAspectRatio = 0
    $shape.Width = $innerWidth
    $shape.Height = $innerHeight
    $shape.AlternativeText = $Placeholder.title
  }

  $placeholderTable.Rows.Item(1).HeightRule = $wdRowHeightExactly
  $placeholderTable.Rows.Item(1).Height = $boxHeight
}

function Get-ItInstructions($Section) {
  $instructions = Get-FirstPropertyValue $Section @("instrucoes", "passo_a_passo", "paragrafos")
  return @(ConvertTo-StringItems $instructions)
}

function Get-ItAttentionItems($Section) {
  $attention = Get-FirstPropertyValue $Section @("atencoes", "pontos_atencao")
  return @(ConvertTo-StringItems $attention)
}

function Get-PrintField($Section) {
  return Get-FirstPropertyValue $Section @("campo_print", "campo_imagem")
}

function Build-ItBody($Word, $Doc, $Content) {
  $it = Get-PropertyValue $Content "it"
  $sections = @(Get-FirstPropertyValue $it @("secoes", "etapas"))
  if ($sections.Count -eq 0) {
    throw "O JSON nao contem secoes em 'it.secoes'."
  }

  $detailTable = $Doc.Tables.Item(5)
  if ($detailTable.Rows.Count -lt 2) {
    throw "O modelo de IT nao contem a linha de descricao detalhada."
  }
  $detailCell = $detailTable.Cell(2, 1)
  $bodyRange = $detailCell.Range
  $bodyRange.End = $bodyRange.End - 1
  $bodyRange.Text = ""
  $bodyRange = $detailCell.Range
  $bodyRange.End = $bodyRange.End - 1
  $bodyRange.Select()
  $selection = $Word.Selection
  $placeholders = New-Object System.Collections.Generic.List[object]
  $seenPrintTags = @{}

  $sectionIndex = 0
  foreach ($section in $sections) {
    if ($null -eq $section) {
      continue
    }
    $sectionIndex++
    $title = Get-TextValue $section @("titulo", "nome") ("ETAPA " + $sectionIndex)
    Type-Paragraph $selection $title $true $false $wdAlignParagraphLeft

    $path = Get-TextValue $section @("caminho")
    $instructions = New-Object System.Collections.Generic.List[string]
    foreach ($sourceInstruction in @(Get-ItInstructions $section)) {
      $sourceText = ([string]$sourceInstruction).Trim()
      if ($sourceText -match '^(?i)Caminho\s*:\s*(.+)$') {
        if ([string]::IsNullOrWhiteSpace($path)) {
          $path = $Matches[1].Trim()
        }
        continue
      }
      $instructions.Add($sourceText)
    }
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      Type-LabeledParagraph $selection $Labels.Caminho $path
    }

    $instructionIndex = 0
    foreach ($instruction in $instructions) {
      $normalizedInstruction = Normalize-InstructionText ([string]$instruction)
      if ([string]::IsNullOrWhiteSpace($normalizedInstruction)) {
        continue
      }
      $instructionIndex++
      Type-Paragraph $selection ($instructionIndex.ToString() + ". " + $normalizedInstruction)
    }

    $attentionItems = @(Get-ItAttentionItems $section)
    if ($attentionItems.Count -gt 0) {
      Type-Paragraph $selection $Labels.Atencao $true
      foreach ($attention in $attentionItems) {
        Type-Paragraph $selection ("- " + ([string]$attention).Trim())
      }
    }

    $printField = Get-PrintField $section
    $includePrintField = Test-BooleanValue (Get-PropertyValue $printField "incluir")
    if ($includePrintField) {
      $rawId = Get-TextValue $printField @("id") (Get-TextValue $section @("id", "print_id"))
      $controlId = ConvertTo-ContentControlId $rawId $sectionIndex
      $tag = "PRINT-" + $controlId
      if ($seenPrintTags.ContainsKey($tag)) {
        throw "ID de campo de print duplicado na IT: $tag"
      }
      $seenPrintTags[$tag] = $true
      $label = Get-TextValue $printField @("rotulo", "titulo")
      $orientation = Get-TextValue $printField @("orientacao") $Labels.DefaultPrintInstruction
      $caption = Get-TextValue $printField @("legenda")
      if ([string]::IsNullOrWhiteSpace($caption)) {
        $captionSubject = $(if (-not [string]::IsNullOrWhiteSpace($label)) { $label } else { $title.TrimEnd(':') })
        $caption = $Labels.DefaultImage + " - " + $captionSubject + "."
      }

      $heading = $Labels.EvidenciaManual + " - " + $tag
      if (Test-BooleanValue (Get-PropertyValue $printField "obrigatorio")) {
        $heading += " [" + $Labels.Obrigatorio + "]"
      }
      if (-not [string]::IsNullOrWhiteSpace($label)) {
        $heading += ": " + $label
      }
      Type-Paragraph $selection $heading $true
      Type-LabeledParagraph $selection $Labels.Orientacao $orientation

      $token = "[[WORD_PICTURE_" + [Guid]::NewGuid().ToString("N") + "]]"
      Type-Paragraph $selection $token
      Type-Paragraph $selection $caption $false $true $wdAlignParagraphCenter

      $controlTitle = $tag
      if (-not [string]::IsNullOrWhiteSpace($label)) {
        $controlTitle += " - " + $label
      }
      if ($controlTitle.Length -gt 250) {
        $controlTitle = $controlTitle.Substring(0, 250)
      }
      $placeholders.Add([PSCustomObject]@{
        token = $token
        tag = $tag
        title = $controlTitle
      })
    }

    Type-Paragraph $selection ""
  }

  foreach ($placeholder in $placeholders) {
    Add-PictureContentControl $Doc $detailCell $placeholder
  }
}

function Build-ItDocument($Word, $Content, $Metadata, [string]$TemplatePath, [string]$OutputPath, [string]$LogoFile) {
  Copy-Item -LiteralPath $TemplatePath -Destination $OutputPath -Force
  $doc = $null
  try {
    $doc = $Word.Documents.Open($OutputPath, $false, $false)
    Apply-HeaderFooter $doc $Content $Metadata "IT" $LogoFile
    Set-OpeningTables $doc $Content $Metadata
    $revisionTable = $doc.Tables.Item(6)
    Build-ItBody $Word $doc $Content
    Write-Revisions $revisionTable (Get-PropertyValue $Content "revisoes")
    Set-PageFields $Word $doc
    $doc.Repaginate()
    Update-AllFields $doc
    $doc.Save()
  } finally {
    Close-WordDocument $doc
  }
}

$contentPath = Get-FullPath $ContentJson
$outputPath = Get-FullPath $OutputDir
$templateRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\templates"))
$popTemplatePath = Join-Path $templateRoot "PR-template.docx"
$itTemplatePath = Join-Path $templateRoot "IN-template.docx"
$logoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\exatas-logo.png"))

if (-not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
  throw "JSON de conteudo nao localizado: $contentPath"
}

$content = [System.IO.File]::ReadAllText($contentPath, (New-Object System.Text.UTF8Encoding $false)) | ConvertFrom-Json
$metadata = Get-DocumentMetadata $content
$selectedTypes = @(Get-SelectedWordTypes $content $DocumentTypes)

if ($selectedTypes.Count -eq 0) {
  Write-Output "Nenhum documento Word foi solicitado."
  return
}

if ($selectedTypes -contains "POP" -and -not (Test-Path -LiteralPath $popTemplatePath -PathType Leaf)) {
  throw "Modelo POP interno nao localizado: $popTemplatePath"
}
if ($selectedTypes -contains "IT" -and -not (Test-Path -LiteralPath $itTemplatePath -PathType Leaf)) {
  throw "Modelo IT interno nao localizado: $itTemplatePath"
}
if (-not (Test-Path -LiteralPath $logoPath -PathType Leaf)) {
  throw "Logo interno nao localizado: $logoPath"
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$popFileName = $null
$itFileName = $null
if ($selectedTypes -contains "POP") {
  $popFileName = Resolve-OutputFileName $content $metadata "POP"
}
if ($selectedTypes -contains "IT") {
  $itFileName = Resolve-OutputFileName $content $metadata "IT"
}
if (($selectedTypes -contains "POP") -and ($selectedTypes -contains "IT") -and $popFileName -ieq $itFileName) {
  throw "POP e IT nao podem usar o mesmo nome de arquivo: $popFileName"
}

$word = $null
try {
  try {
    $word = New-Object -ComObject Word.Application
  } catch {
    throw "Microsoft Word desktop nao esta disponivel para automacao COM. $($_.Exception.Message)"
  }

  $word.Visible = $false
  $word.DisplayAlerts = 0

  if ($selectedTypes -contains "POP") {
    Build-PopDocument $word $content $metadata $popTemplatePath (Join-Path $outputPath $popFileName) $logoPath
  }
  if ($selectedTypes -contains "IT") {
    Build-ItDocument $word $content $metadata $itTemplatePath (Join-Path $outputPath $itFileName) $logoPath
  }
} finally {
  if ($null -ne $word) {
    try {
      $word.Quit()
    } finally {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Output ("Documentos Word gerados em: " + $outputPath)
