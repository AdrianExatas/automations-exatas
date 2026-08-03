[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ContentJson,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [Alias("Tipos")][string[]]$DocumentTypes = @()
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

# Excel constants (kept local so the script does not require an Office interop assembly).
$xlPortrait = 1
$xlLandscape = 2
$xlCenter = -4108
$xlLeft = -4131
$xlTop = -4160
$xlContinuous = 1
$xlThin = 2
$xlMedium = -4138
$xlValidateList = 3
$xlValidateWholeNumber = 1
$xlValidAlertStop = 1
$xlBetween = 1
$xlCellValue = 1
$xlEqual = 3
$xlGreaterEqual = 7
$xlLessEqual = 8
$xlUnlockedCells = 1
$xlLinkTypeExcelLinks = 1

function U([string]$Text) {
  return [regex]::Replace($Text, '\\u([0-9a-fA-F]{4})', {
    param($match)
    return [char][Convert]::ToInt32($match.Groups[1].Value, 16)
  })
}

$TextNo = U 'N\u00C3O'
$TextPending = "PENDENTE"
$TextConforme = "CONFORME"
$TextNaoConforme = $TextNo + " CONFORME"
$TextToleravel = U 'TOLER\u00C1VEL'
$TextInaceitavel = U 'INACEIT\u00C1VEL'
$TextClassificacao = U 'CLASSIFICA\u00C7\u00C3O'
$TextEvidencia = U 'EVID\u00CANCIA/PRINT \u2014 INSER\u00C7\u00C3O MANUAL'
$TextValidacao = U 'PENDENTE DE VALIDA\u00C7\u00C3O'
$TextSetor = "SETOR"
$TextCodigo = U 'C\u00D3DIGO'
$TextVersao = U 'VERS\u00C3O'
$TextEmissao = U 'EMISS\u00C3O'
$TextRevisao = U 'REVIS\u00C3O'

function Get-FullPath([string]$PathValue) {
  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Test-IsTransientComFailure($Exception) {
  $current = $Exception
  while ($null -ne $current) {
    if ($current.HResult -in @(-2147418111, -2146777998, -2146828206)) {
      return $true
    }
    $current = $current.InnerException
  }
  return $false
}

function Invoke-TransientComRetry([scriptblock]$Operation, [string]$OperationName, [int]$MaxAttempts = 3) {
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      & $Operation
      return
    } catch {
      if (-not (Test-IsTransientComFailure $_.Exception) -or $attempt -ge $MaxAttempts) {
        throw
      }
      Write-Verbose ("Falha COM transitoria em {0}; nova tentativa {1}/{2}." -f $OperationName, ($attempt + 1), $MaxAttempts)
      Start-Sleep -Milliseconds (750 * $attempt)
    }
  }
}

function Get-PropertyValue($Object, [string]$Name, $DefaultValue = "") {
  if ($null -eq $Object) {
    return $DefaultValue
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) {
    return $DefaultValue
  }
  return $property.Value
}

function Get-StringValue($Object, [string]$Name, [string]$DefaultValue = "") {
  $value = Get-PropertyValue $Object $Name $DefaultValue
  if ($null -eq $value) {
    return $DefaultValue
  }
  $text = [string]$value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $DefaultValue
  }
  return $text.Trim()
}

function Get-ArrayValue($Object, [string]$Name) {
  $value = Get-PropertyValue $Object $Name $null
  if ($null -eq $value) {
    return @()
  }
  return ,@($value)
}

function Get-BoolValue($Object, [string]$Name, [bool]$DefaultValue = $false) {
  $value = Get-PropertyValue $Object $Name $DefaultValue
  if ($value -is [bool]) {
    return $value
  }
  $text = ([string]$value).Trim().ToUpperInvariant()
  return $text -in @("TRUE", "1", "SIM", "YES")
}

function Get-OleColor([string]$Hex) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($Hex)
  return [System.Drawing.ColorTranslator]::ToOle($color)
}

$ColorNavy = Get-OleColor "#002060"
$ColorBlue = Get-OleColor "#17365D"
$ColorLightBlue = Get-OleColor "#D9EAF7"
$ColorLightTeal = Get-OleColor "#DDEBF7"
$ColorWhite = Get-OleColor "#FFFFFF"
$ColorText = Get-OleColor "#1F1F1F"
$ColorBorder = Get-OleColor "#7F8C8D"
$ColorGray = Get-OleColor "#F2F2F2"
$ColorInput = Get-OleColor "#FFF2CC"
$ColorPending = Get-OleColor "#FFF2CC"
$ColorGreen = Get-OleColor "#C6E0B4"
$ColorYellow = Get-OleColor "#FFE699"
$ColorRed = Get-OleColor "#F4B084"
$ColorSuggested = Get-OleColor "#FFF4CE"

function Quote-FormulaText([string]$Text) {
  return '"' + $Text.Replace('"', '""') + '"'
}

function Set-Text($Cell, [string]$Text) {
  $Cell.NumberFormat = "@"
  $Cell.Value2 = $Text
}

function Set-TitleStyle($Range, [string]$FontName = "Arial Narrow", [double]$FontSize = 14) {
  $Range.Interior.Color = $ColorNavy
  $Range.Font.Color = $ColorWhite
  $Range.Font.Name = $FontName
  $Range.Font.Size = $FontSize
  $Range.Font.Bold = $true
  $Range.HorizontalAlignment = $xlCenter
  $Range.VerticalAlignment = $xlCenter
  $Range.WrapText = $true
}

function Set-SectionStyle($Range, [string]$FontName = "Arial Narrow") {
  $Range.Interior.Color = $ColorBlue
  $Range.Font.Color = $ColorWhite
  $Range.Font.Name = $FontName
  $Range.Font.Size = 10
  $Range.Font.Bold = $true
  $Range.HorizontalAlignment = $xlLeft
  $Range.VerticalAlignment = $xlCenter
  $Range.WrapText = $true
}

function Set-HeaderStyle($Range, [string]$FontName = "Arial Narrow") {
  $Range.Interior.Color = $ColorLightBlue
  $Range.Font.Color = $ColorText
  $Range.Font.Name = $FontName
  $Range.Font.Size = 10
  $Range.Font.Bold = $true
  $Range.HorizontalAlignment = $xlCenter
  $Range.VerticalAlignment = $xlCenter
  $Range.WrapText = $true
  Set-AllBorders $Range
}

function Set-AllBorders($Range, [int]$Weight = $xlThin) {
  $Range.Borders.LineStyle = $xlContinuous
  $Range.Borders.Color = $ColorBorder
  $Range.Borders.Weight = $Weight
}

function Set-BodyStyle($Range, [string]$FontName = "Arial Narrow", [double]$FontSize = 10) {
  $Range.Font.Name = $FontName
  $Range.Font.Size = $FontSize
  $Range.Font.Color = $ColorText
  $Range.VerticalAlignment = $xlTop
  $Range.WrapText = $true
  Set-AllBorders $Range
}

function Add-StatusFormatting($Range) {
  $Range.FormatConditions.Delete()
  $pendingCondition = $Range.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText $TextPending)))
  $pendingCondition.Interior.Color = $ColorPending
  $pendingCondition.Font.Color = $ColorText
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($pendingCondition)
  $conformeCondition = $Range.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText $TextConforme)))
  $conformeCondition.Interior.Color = $ColorGreen
  $conformeCondition.Font.Color = $ColorText
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($conformeCondition)
  $naoCondition = $Range.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText $TextNaoConforme)))
  $naoCondition.Interior.Color = $ColorRed
  $naoCondition.Font.Color = $ColorText
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($naoCondition)
}

function Add-RiskFormatting($ScoreRange, $ClassificationRange) {
  $ScoreRange.FormatConditions.Delete()
  $greenScore = $ScoreRange.FormatConditions.Add($xlCellValue, $xlLessEqual, "4")
  $greenScore.Interior.Color = $ColorGreen
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($greenScore)
  $yellowScore = $ScoreRange.FormatConditions.Add($xlCellValue, $xlBetween, "5", "10")
  $yellowScore.Interior.Color = $ColorYellow
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($yellowScore)
  $redScore = $ScoreRange.FormatConditions.Add($xlCellValue, $xlGreaterEqual, "12")
  $redScore.Interior.Color = $ColorRed
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($redScore)

  $ClassificationRange.FormatConditions.Delete()
  $greenClass = $ClassificationRange.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText $TextToleravel)))
  $greenClass.Interior.Color = $ColorGreen
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($greenClass)
  $yellowClass = $ClassificationRange.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText "ALARP")))
  $yellowClass.Interior.Color = $ColorYellow
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($yellowClass)
  $redClass = $ClassificationRange.FormatConditions.Add($xlCellValue, $xlEqual, ("=" + (Quote-FormulaText $TextInaceitavel)))
  $redClass.Interior.Color = $ColorRed
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($redClass)
}

function Add-ListValidation($Range, [string]$Formula, [string]$Title, [string]$Message) {
  $Range.Validation.Delete()
  $Range.Validation.Add($xlValidateList, $xlValidAlertStop, $xlBetween, $Formula)
  $Range.Validation.IgnoreBlank = $true
  $Range.Validation.InCellDropdown = $true
  $Range.Validation.ShowError = $true
  $Range.Validation.ErrorTitle = $Title
  $Range.Validation.ErrorMessage = $Message
}

function Add-WholeNumberValidation($Range) {
  $Range.Validation.Delete()
  $Range.Validation.Add($xlValidateWholeNumber, $xlValidAlertStop, $xlBetween, "1", "5")
  $Range.Validation.IgnoreBlank = $true
  $Range.Validation.ShowInput = $true
  $Range.Validation.InputTitle = U 'Avalia\u00E7\u00E3o de risco'
  $Range.Validation.InputMessage = U 'Informe um n\u00FAmero inteiro entre 1 e 5.'
  $Range.Validation.ShowError = $true
  $Range.Validation.ErrorTitle = U 'Valor inv\u00E1lido'
  $Range.Validation.ErrorMessage = U 'Use apenas valores inteiros de 1 a 5 ou deixe em branco.'
}

function Get-AbsoluteReference([string]$SheetName, [string]$Column, [int]$FirstRow, [int]$LastRow) {
  $escapedSheet = $SheetName.Replace("'", "''")
  return "='" + $escapedSheet + "'!" + '$' + $Column + '$' + $FirstRow + ":" + '$' + $Column + '$' + $LastRow
}

function Add-WorkbookName($Workbook, [string]$Name, [string]$RefersTo) {
  $createdName = $Workbook.Names.Add($Name, $RefersTo)
  if ($null -ne $createdName) {
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($createdName)
  }
}

function Remove-WorkbookNamesAndLinks($Workbook) {
  for ($index = $Workbook.Names.Count; $index -ge 1; $index--) {
    $name = $Workbook.Names.Item($index)
    try {
      $name.Delete()
    } finally {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($name)
    }
  }

  try {
    $links = $Workbook.LinkSources($xlLinkTypeExcelLinks)
    foreach ($link in @($links)) {
      if (-not [string]::IsNullOrWhiteSpace([string]$link)) {
        $Workbook.BreakLink([string]$link, $xlLinkTypeExcelLinks)
      }
    }
  } catch {
    # A workbook without links raises a COM error on some Excel builds.
  }
}

function Reset-Workbook($Workbook, [string]$SheetName) {
  Remove-WorkbookNamesAndLinks $Workbook

  for ($index = $Workbook.Worksheets.Count; $index -ge 2; $index--) {
    $extraSheet = $Workbook.Worksheets.Item($index)
    try {
      $extraSheet.Delete()
    } finally {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($extraSheet)
    }
  }

  $sheet = $Workbook.Worksheets.Item(1)
  $sheet.Visible = -1
  $sheet.Name = $SheetName
  try { $sheet.Unprotect("") } catch { }
  [void]$sheet.Cells.UnMerge()
  [void]$sheet.Cells.Clear()

  $hasLogo = $false
  for ($index = $sheet.Shapes.Count; $index -ge 1; $index--) {
    $shape = $sheet.Shapes.Item($index)
    try {
      if ([string]$shape.Name -eq "EXATAS_LOGO") {
        $hasLogo = $true
      } else {
        [void]$shape.Delete()
      }
    } finally {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape)
    }
  }

  if (-not $hasLogo) {
    $logoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\exatas-logo.png"))
    if (Test-Path -LiteralPath $logoPath -PathType Leaf) {
      $logo = $sheet.Shapes.AddPicture($logoPath, 0, -1, $sheet.Range("A1").Left, $sheet.Range("A1").Top, 145, 33)
      try {
        $logo.Name = "EXATAS_LOGO"
      } finally {
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($logo)
      }
    }
  }

  $sheet.Cells.Locked = $true
  $sheet.Cells.FormulaHidden = $false
  $sheet.DisplayPageBreaks = $false
  return $sheet
}

function Assert-OutputFileName([string]$FileName, [string]$Kind) {
  if ([string]::IsNullOrWhiteSpace($FileName)) {
    throw "Nome de saida ausente para $Kind."
  }
  if ([System.IO.Path]::IsPathRooted($FileName) -or [System.IO.Path]::GetFileName($FileName) -ne $FileName) {
    throw "O nome de saida de $Kind deve conter somente o nome do arquivo: $FileName"
  }
  if ([System.IO.Path]::GetExtension($FileName).ToLowerInvariant() -ne ".xlsx") {
    throw "O arquivo de $Kind deve usar a extensao .xlsx: $FileName"
  }
  if ($FileName.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
    throw "O nome de saida de $Kind contem caracteres invalidos: $FileName"
  }
}

function Get-OutputFileName($Content, [string]$PropertyName, [string]$DefaultName, [string]$Kind) {
  $output = Get-PropertyValue $Content "saida" $null
  $fileName = Get-StringValue $output $PropertyName $DefaultName
  Assert-OutputFileName $fileName $Kind
  return $fileName
}

function Copy-Template([string]$TemplatePath, [string]$DestinationPath) {
  if (-not (Test-Path -LiteralPath $TemplatePath -PathType Leaf)) {
    throw "Modelo Excel nao localizado: $TemplatePath"
  }
  Copy-Item -LiteralPath $TemplatePath -Destination $DestinationPath -Force
}

function Set-CommonDocumentProperties($Workbook) {
  try { $Workbook.RemovePersonalInformation = $true } catch { }
  try { $Workbook.BuiltinDocumentProperties("Author").Value = "Exatas Contabilidade" } catch { }
  try { $Workbook.BuiltinDocumentProperties("Last Author").Value = "Exatas Contabilidade" } catch { }
  try { $Workbook.BuiltinDocumentProperties("Company").Value = "Exatas Contabilidade" } catch { }
  try { $Workbook.BuiltinDocumentProperties("Comments").Value = "" } catch { }
}

function Set-FormMetadata($Sheet, $Content) {
  $document = Get-PropertyValue $Content "documento" $null
  $form = Get-PropertyValue $Content "form" $null
  $fields = Get-PropertyValue $form "campos" $null
  $clientLabel = U 'CLIENTE / IDENTIFICA\u00C7\u00C3O'
  $deadlineLabel = "PRAZO"
  $contextLabel = "CONTEXTO"
  $clientValue = Get-StringValue $fields "cliente" (Get-StringValue $fields "identificacao" "")
  $deadlineValue = Get-StringValue $fields "prazo" ""
  $contextValue = Get-StringValue $fields "contexto" ""
  $hasDeadlineContextField = $false

  foreach ($contextField in (Get-ArrayValue $form "campos_contexto")) {
    $fieldId = (Get-StringValue $contextField "id" "").ToLowerInvariant()
    $fieldLabel = Get-StringValue $contextField "rotulo" ""
    $fieldValue = Get-StringValue $contextField "valor_inicial" ""
    if ($fieldId -in @("cliente", "identificacao", "cliente_identificacao", "identificacao_cliente")) {
      if (-not [string]::IsNullOrWhiteSpace($fieldLabel)) { $clientLabel = $fieldLabel }
      $clientValue = $fieldValue
    } elseif ($fieldId -eq "prazo") {
      if (-not [string]::IsNullOrWhiteSpace($fieldLabel)) { $deadlineLabel = $fieldLabel }
      $deadlineValue = $fieldValue
      $hasDeadlineContextField = $true
    } elseif ($fieldId -eq "contexto") {
      if (-not [string]::IsNullOrWhiteSpace($fieldLabel)) { $contextLabel = $fieldLabel }
      $contextValue = $fieldValue
    }
  }

  if (-not $hasDeadlineContextField -and [string]::IsNullOrWhiteSpace($deadlineValue)) {
    $deadlineDays = Get-PropertyValue $form "prazo_dias" $null
    if ($null -ne $deadlineDays -and -not [string]::IsNullOrWhiteSpace([string]$deadlineDays)) {
      $deadlineLabel = U 'PRAZO (DIAS)'
      $deadlineValue = [string]$deadlineDays
    }
  }

  [void]$Sheet.Range("C1:H2").Merge()
  Set-Text $Sheet.Range("C1") (U 'FORMUL\u00C1RIO DE VERIFICA\u00C7\u00C3O')
  Set-TitleStyle $Sheet.Range("C1:H2") "Arial Narrow" 15
  $Sheet.Rows.Item(1).RowHeight = 24
  $Sheet.Rows.Item(2).RowHeight = 24

  Set-Text $Sheet.Range("A3") $TextSetor
  [void]$Sheet.Range("B3:C3").Merge()
  Set-Text $Sheet.Range("B3") (Get-StringValue $document "setor" $TextValidacao)
  Set-Text $Sheet.Range("D3") $TextCodigo
  [void]$Sheet.Range("E3:F3").Merge()
  Set-Text $Sheet.Range("E3") (Get-StringValue $document "codigo_form" "FORM.XXX.XXX")
  Set-Text $Sheet.Range("G3") $TextVersao
  Set-Text $Sheet.Range("H3") (Get-StringValue $document "versao" "00")
  Set-HeaderStyle $Sheet.Range("A3:H3")
  $Sheet.Range("B3:C3").Interior.Color = $ColorWhite
  $Sheet.Range("E3:F3").Interior.Color = $ColorWhite
  $Sheet.Range("H3").Interior.Color = $ColorWhite

  Set-Text $Sheet.Range("A4") $TextEmissao
  [void]$Sheet.Range("B4:C4").Merge()
  Set-Text $Sheet.Range("B4") (Get-StringValue $document "emissao" "")
  Set-Text $Sheet.Range("D4") $TextRevisao
  [void]$Sheet.Range("E4:F4").Merge()
  Set-Text $Sheet.Range("E4") (Get-StringValue $document "revisao" "")
  Set-Text $Sheet.Range("G4") (U 'T\u00CDTULO')
  Set-Text $Sheet.Range("H4") (Get-StringValue $document "titulo" "")
  Set-HeaderStyle $Sheet.Range("A4:H4")
  $Sheet.Range("B4:C4").Interior.Color = $ColorWhite
  $Sheet.Range("E4:F4").Interior.Color = $ColorWhite
  $Sheet.Range("H4").Interior.Color = $ColorWhite

  Set-Text $Sheet.Range("A5") $clientLabel
  [void]$Sheet.Range("B5:D5").Merge()
  Set-Text $Sheet.Range("B5") $clientValue
  Set-Text $Sheet.Range("E5") $deadlineLabel
  [void]$Sheet.Range("F5:H5").Merge()
  Set-Text $Sheet.Range("F5") $deadlineValue
  Set-HeaderStyle $Sheet.Range("A5:H5")
  $Sheet.Range("B5:D5").Interior.Color = $ColorInput
  $Sheet.Range("F5:H5").Interior.Color = $ColorInput
  $Sheet.Range("B5:D5").Locked = $false
  $Sheet.Range("F5:H5").Locked = $false

  Set-Text $Sheet.Range("A6") $contextLabel
  [void]$Sheet.Range("B6:H6").Merge()
  Set-Text $Sheet.Range("B6") $contextValue
  Set-HeaderStyle $Sheet.Range("A6:H6")
  $Sheet.Range("B6:H6").Interior.Color = $ColorInput
  $Sheet.Range("B6:H6").Locked = $false
  $Sheet.Rows.Item(6).RowHeight = 32

  [void]$Sheet.Range("A8:H8").Merge()
  Set-Text $Sheet.Range("A8") (U 'RESUMO DA INSPE\u00C7\u00C3O')
  Set-SectionStyle $Sheet.Range("A8:H8")
  Set-Text $Sheet.Range("A9") "PARECER GERAL"
  [void]$Sheet.Range("B9:F9").Merge()
  Set-Text $Sheet.Range("G9") "COEFICIENTE"
  Set-HeaderStyle $Sheet.Range("A9:H9")
  $Sheet.Range("B9:F9").Interior.Color = $ColorPending
  $Sheet.Range("H9").Interior.Color = $ColorPending
}

function Build-FormWorkbook($Excel, $Content, [string]$TemplatePath, [string]$OutputPath, [string]$ListSeparator) {
  Copy-Template $TemplatePath $OutputPath
  $workbook = $null
  $sheet = $null
  try {
    try {
      Invoke-TransientComRetry {
        $script:__openedWorkbook = $Excel.Workbooks.Open($OutputPath, 0, $false)
      } "abrir FORM" 6
      $workbook = $script:__openedWorkbook
      if ($null -eq $workbook -or [int]$workbook.Worksheets.Count -lt 1) {
        throw "O Excel retornou um workbook sem planilha editavel."
      }
    } catch {
      throw "O Excel nao conseguiu abrir o modelo do FORM. Confirme que o Excel desktop esta instalado, licenciado e sem janelas de dialogo abertas. Detalhe: $($_.Exception.Message)"
    }
    Set-CommonDocumentProperties $workbook
    $sheet = Reset-Workbook $workbook "FORM"

    $sheet.Columns.Item("A").ColumnWidth = 10
    $sheet.Columns.Item("B").ColumnWidth = 20
    $sheet.Columns.Item("C").ColumnWidth = 14
    $sheet.Columns.Item("D").ColumnWidth = 14
    $sheet.Columns.Item("E").ColumnWidth = 16
    $sheet.Columns.Item("F").ColumnWidth = 14
    $sheet.Columns.Item("G").ColumnWidth = 18
    $sheet.Columns.Item("H").ColumnWidth = 13
    Set-FormMetadata $sheet $Content

    $form = Get-PropertyValue $Content "form" $null
    $blocks = Get-ArrayValue $form "blocos"
    $itemCount = 0
    foreach ($block in $blocks) {
      $itemCount += (Get-ArrayValue $block "itens").Count
    }
    if ($itemCount -lt 1) {
      throw "O conteudo do FORM deve conter ao menos um item em form.blocos[].itens[]."
    }

    Set-Text $sheet.Range("J1") "ITEM_ID"
    Set-Text $sheet.Range("K1") "RESPOSTA_CONFORME"
    Set-Text $sheet.Range("L1") "RESPOSTA"
    Set-Text $sheet.Range("M1") "PARECER"
    Set-Text $sheet.Range("N1") "COEFICIENTE"

    $row = 11
    $helperRow = 2
    $blockNumber = 0
    foreach ($block in $blocks) {
      $blockNumber++
      $blockId = Get-StringValue $block "id" ("B{0:D2}" -f $blockNumber)
      $blockTitle = Get-StringValue $block "titulo" (U 'BLOCO DE VERIFICA\u00C7\u00C3O')
      $blockSector = Get-StringValue $block "setor" ""
      $heading = ("{0}. {1}" -f $blockNumber, $blockTitle)
      if (-not [string]::IsNullOrWhiteSpace($blockSector)) {
        $heading += " | " + $TextSetor + ": " + $blockSector
      }

      [void]$sheet.Range("A$row:H$row").Merge()
      Set-Text $sheet.Range("A$row") $heading
      Set-SectionStyle $sheet.Range("A$row:H$row")
      $sheet.Rows.Item($row).RowHeight = 23
      $row++

      [void]$sheet.Range("B$row:E$row").Merge()
      [void]$sheet.Range("G$row:H$row").Merge()
      Set-Text $sheet.Cells.Item($row, 1) "ID"
      Set-Text $sheet.Cells.Item($row, 2) (U 'ITEM DE VERIFICA\u00C7\u00C3O')
      Set-Text $sheet.Cells.Item($row, 6) "RESPOSTA"
      Set-Text $sheet.Cells.Item($row, 7) "RESULTADO"
      Set-HeaderStyle $sheet.Range("A$row:H$row")
      $row++

      $firstItemRow = $row
      $items = Get-ArrayValue $block "itens"
      $itemNumber = 0
      foreach ($item in $items) {
        $itemNumber++
        $itemId = Get-StringValue $item "id" ($blockId + "-I" + ("{0:D2}" -f $itemNumber))
        $question = Get-StringValue $item "pergunta" $TextValidacao
        $expected = (Get-StringValue $item "resposta_conforme" "SIM").ToUpperInvariant()
        if ($expected -notin @("SIM", $TextNo)) {
          $expected = "SIM"
        }

        [void]$sheet.Range("B$row:E$row").Merge()
        [void]$sheet.Range("G$row:H$row").Merge()
        Set-Text $sheet.Cells.Item($row, 1) $itemId
        Set-Text $sheet.Cells.Item($row, 2) $question
        Set-Text $sheet.Cells.Item($row, 6) ""
        $sheet.Cells.Item($row, 7).Formula = ('=IF(F{0}="",{1},IF(F{0}={2},{3},{4}))' -f $row, (Quote-FormulaText $TextPending), (Quote-FormulaText $expected), (Quote-FormulaText $TextConforme), (Quote-FormulaText $TextNaoConforme))
        $sheet.Range("A$row:H$row").Interior.Color = $ColorWhite
        Set-BodyStyle $sheet.Range("A$row:H$row")
        $sheet.Cells.Item($row, 1).HorizontalAlignment = $xlCenter
        $sheet.Cells.Item($row, 6).HorizontalAlignment = $xlCenter
        $sheet.Range("G$row:H$row").HorizontalAlignment = $xlCenter
        $sheet.Cells.Item($row, 6).Interior.Color = $ColorInput
        $sheet.Cells.Item($row, 6).Locked = $false
        $sheet.Range("G$row:H$row").FormulaHidden = $true
        Add-ListValidation $sheet.Cells.Item($row, 6) ("SIM" + $ListSeparator + $TextNo) (U 'Resposta inv\u00E1lida') (U 'Selecione apenas SIM ou N\u00C3O.')
        Add-StatusFormatting $sheet.Range("G$row:H$row")
        $sheet.Rows.Item($row).RowHeight = 36

        Set-Text $sheet.Cells.Item($helperRow, 10) $itemId
        Set-Text $sheet.Cells.Item($helperRow, 11) $expected
        $sheet.Cells.Item($helperRow, 12).Formula = "=F$row"
        $sheet.Cells.Item($helperRow, 13).Formula = "=G$row"
        $sheet.Cells.Item($helperRow, 14).Formula = ('=IF(G{0}={1},1,IF(G{0}={2},0,""))' -f $row, (Quote-FormulaText $TextConforme), (Quote-FormulaText $TextNaoConforme))
        $helperRow++
        $row++
      }
      $lastItemRow = $row - 1

      [void]$sheet.Range("A$row:E$row").Merge()
      [void]$sheet.Range("F$row:G$row").Merge()
      Set-Text $sheet.Cells.Item($row, 1) (U 'PARECER DO BLOCO')
      $resultRange = "G" + $firstItemRow + ":G" + $lastItemRow
      $sheet.Cells.Item($row, 6).Formula = ("=IF(COUNTIF({0},{1})>0,{1},IF(COUNTIF({0},{2})>0,{2},{3}))" -f $resultRange, (Quote-FormulaText $TextPending), (Quote-FormulaText $TextNaoConforme), (Quote-FormulaText $TextConforme))
      $sheet.Cells.Item($row, 8).Formula = ('=IF(COUNTIF({0},{1})>0,"",COUNTIF({0},{2})/ROWS({0}))' -f $resultRange, (Quote-FormulaText $TextPending), (Quote-FormulaText $TextConforme))
      $sheet.Cells.Item($row, 8).NumberFormat = "0%"
      Set-HeaderStyle $sheet.Range("A$row:H$row")
      $sheet.Range("F$row:G$row").Interior.Color = $ColorPending
      $sheet.Cells.Item($row, 8).Interior.Color = $ColorPending
      $sheet.Range("F$row:G$row").FormulaHidden = $true
      $sheet.Cells.Item($row, 8).FormulaHidden = $true
      Add-StatusFormatting $sheet.Range("F$row:G$row")
      $row++

      [void]$sheet.Range("A$row:H$row").Merge()
      Set-Text $sheet.Range("A$row") $TextEvidencia
      Set-HeaderStyle $sheet.Range("A$row:H$row")
      $sheet.Range("A$row:H$row").Interior.Color = $ColorLightTeal
      $row++

      [void]$sheet.Range("A$row:H$row").Merge()
      $evidenceInstruction = Get-StringValue $block "orientacao_evidencia" ""
      if ([string]::IsNullOrWhiteSpace($evidenceInstruction)) {
        $legacyEvidenceInstruction = Get-PropertyValue $block "campo_evidencia" $null
        if ($legacyEvidenceInstruction -is [string] -and -not [string]::IsNullOrWhiteSpace($legacyEvidenceInstruction)) {
          $evidenceInstruction = $legacyEvidenceInstruction.Trim()
        }
      }
      if ([string]::IsNullOrWhiteSpace($evidenceInstruction)) {
        $evidenceInstruction = U 'Insira ou cole aqui a evid\u00EAncia visual correspondente a este bloco. Nenhuma imagem \u00E9 anexada automaticamente.'
      }
      Set-Text $sheet.Range("A$row") $evidenceInstruction
      $sheet.Range("A$row:H$row").Interior.Color = $ColorGray
      $sheet.Range("A$row:H$row").Font.Name = "Arial Narrow"
      $sheet.Range("A$row:H$row").Font.Size = 10
      $sheet.Range("A$row:H$row").Font.Italic = $true
      $sheet.Range("A$row:H$row").Font.Color = $ColorBorder
      $sheet.Range("A$row:H$row").HorizontalAlignment = $xlCenter
      $sheet.Range("A$row:H$row").VerticalAlignment = $xlCenter
      $sheet.Range("A$row:H$row").WrapText = $true
      $sheet.Range("A$row:H$row").Locked = $false
      Set-AllBorders $sheet.Range("A$row:H$row") $xlMedium
      $sheet.Rows.Item($row).RowHeight = 115
      $row += 2
    }

    $helperLastRow = $helperRow - 1
    Add-WorkbookName $workbook "FORM_RESPOSTAS" (Get-AbsoluteReference "FORM" "L" 2 $helperLastRow)
    Add-WorkbookName $workbook "FORM_PARECERES" (Get-AbsoluteReference "FORM" "M" 2 $helperLastRow)
    Add-WorkbookName $workbook "FORM_COEFICIENTES" (Get-AbsoluteReference "FORM" "N" 2 $helperLastRow)
    $sheet.Range("B9:F9").Formula = ("=IF(COUNTIF(FORM_PARECERES,{0})>0,{0},IF(COUNTIF(FORM_PARECERES,{1})>0,{1},{2}))" -f (Quote-FormulaText $TextPending), (Quote-FormulaText $TextNaoConforme), (Quote-FormulaText $TextConforme))
    $sheet.Range("H9").Formula = ('=IF(COUNTIF(FORM_PARECERES,{0})>0,"",AVERAGE(FORM_COEFICIENTES))' -f (Quote-FormulaText $TextPending))
    $sheet.Range("H9").NumberFormat = "0%"
    $sheet.Range("B9:F9").FormulaHidden = $true
    $sheet.Range("H9").FormulaHidden = $true
    Add-StatusFormatting $sheet.Range("B9:F9")

    $sheet.Columns.Item("J:N").EntireColumn.Hidden = $true
    $sheet.Range("A1:H" + ($row - 1)).Font.Name = "Arial Narrow"
    $sheet.PageSetup.PrintArea = '$A$1:$H$' + ($row - 1)
    $sheet.PageSetup.Orientation = $xlPortrait
    $sheet.PageSetup.Zoom = $false
    $sheet.PageSetup.FitToPagesWide = 1
    $sheet.PageSetup.FitToPagesTall = $false
    $sheet.PageSetup.CenterHorizontally = $true
    $sheet.PageSetup.LeftMargin = $Excel.InchesToPoints(0.25)
    $sheet.PageSetup.RightMargin = $Excel.InchesToPoints(0.25)
    $sheet.PageSetup.TopMargin = $Excel.InchesToPoints(0.4)
    $sheet.PageSetup.BottomMargin = $Excel.InchesToPoints(0.4)
    $sheet.PageSetup.CenterFooter = U 'P\u00E1gina &P de &N'
    $sheet.Protect("", $false, $true, $true)
    $sheet.EnableSelection = $xlUnlockedCells

    $Excel.CalculateFullRebuild()
    Invoke-TransientComRetry { $workbook.Save() } "salvar FORM"
  } finally {
    if ($null -ne $sheet) {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($sheet)
    }
    if ($null -ne $workbook) {
      try {
        Invoke-TransientComRetry { $workbook.Close($false) } "fechar FORM"
      } catch {
        Write-Warning ("Nao foi possivel fechar o workbook do FORM: " + $_.Exception.Message)
      }
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($workbook)
    }
  }
}

function Get-FlowSteps($Content) {
  $steps = @()
  $pop = Get-PropertyValue $Content "pop" $null
  foreach ($step in (Get-ArrayValue $pop "etapas")) {
    $label = Get-StringValue $step "o_que" ""
    if ([string]::IsNullOrWhiteSpace($label)) { $label = Get-StringValue $step "titulo" "" }
    if ([string]::IsNullOrWhiteSpace($label)) { $label = Get-StringValue $step "etapa" "" }
    if (-not [string]::IsNullOrWhiteSpace($label)) { $steps += $label }
  }
  if ($steps.Count -eq 0) {
    $mp = Get-PropertyValue $Content "mp" $null
    foreach ($risk in (Get-ArrayValue $mp "riscos")) {
      $label = Get-StringValue $risk "etapa" ""
      if (-not [string]::IsNullOrWhiteSpace($label) -and $steps -notcontains $label) {
        $steps += $label
      }
    }
  }
  return ,@($steps)
}

function Set-MpMetadata($Sheet, $Content) {
  $document = Get-PropertyValue $Content "documento" $null

  [void]$Sheet.Range("C1:H2").Merge()
  Set-Text $Sheet.Range("C1") "MAPEAMENTO DE PROCESSO"
  Set-TitleStyle $Sheet.Range("C1:H2") "Bahnschrift" 16
  $Sheet.Rows.Item(1).RowHeight = 24
  $Sheet.Rows.Item(2).RowHeight = 24

  Set-Text $Sheet.Range("I1") $TextCodigo
  [void]$Sheet.Range("J1:K1").Merge()
  Set-Text $Sheet.Range("J1") (Get-StringValue $document "codigo_mp" "MP.XXX.XXX")
  Set-Text $Sheet.Range("I2") $TextVersao
  [void]$Sheet.Range("J2:K2").Merge()
  Set-Text $Sheet.Range("J2") (Get-StringValue $document "versao" "00")
  Set-HeaderStyle $Sheet.Range("I1:K2") "Bahnschrift"
  $Sheet.Range("J1:K2").Interior.Color = $ColorWhite

  Set-Text $Sheet.Range("A3") $TextSetor
  [void]$Sheet.Range("B3:C3").Merge()
  Set-Text $Sheet.Range("B3") (Get-StringValue $document "setor" $TextValidacao)
  Set-Text $Sheet.Range("D3") "PROCESSO"
  [void]$Sheet.Range("E3:H3").Merge()
  Set-Text $Sheet.Range("E3") (Get-StringValue $document "titulo" "")
  Set-Text $Sheet.Range("I3") $TextEmissao
  [void]$Sheet.Range("J3:K3").Merge()
  Set-Text $Sheet.Range("J3") (Get-StringValue $document "emissao" "")
  Set-HeaderStyle $Sheet.Range("A3:K3") "Bahnschrift"
  $Sheet.Range("B3:C3").Interior.Color = $ColorWhite
  $Sheet.Range("E3:H3").Interior.Color = $ColorWhite
  $Sheet.Range("J3:K3").Interior.Color = $ColorWhite

  Set-Text $Sheet.Range("A4") (U 'RESULTADO ESPERADO')
  [void]$Sheet.Range("B4:H4").Merge()
  Set-Text $Sheet.Range("B4") (Get-StringValue $document "resultado_esperado" $TextValidacao)
  Set-Text $Sheet.Range("I4") $TextRevisao
  [void]$Sheet.Range("J4:K4").Merge()
  Set-Text $Sheet.Range("J4") (Get-StringValue $document "revisao" "")
  Set-HeaderStyle $Sheet.Range("A4:K4") "Bahnschrift"
  $Sheet.Range("B4:H4").Interior.Color = $ColorWhite
  $Sheet.Range("J4:K4").Interior.Color = $ColorWhite
  $Sheet.Rows.Item(4).RowHeight = 35
}

function Write-Sipoc($Sheet, $Mp, [int]$StartRow) {
  $chain = Get-PropertyValue $Mp "cadeia" $null
  $suppliers = Get-ArrayValue $chain "fornecedores"
  $inputs = Get-ArrayValue $chain "entradas"
  $clients = Get-ArrayValue $chain "clientes"
  $outputs = Get-ArrayValue $chain "saidas"
  $rowCount = [Math]::Max(1, [Math]::Max([Math]::Max($suppliers.Count, $inputs.Count), [Math]::Max($clients.Count, $outputs.Count)))

  [void]$Sheet.Range("A$StartRow:K$StartRow").Merge()
  Set-Text $Sheet.Range("A$StartRow") "CADEIA CLIENTE-FORNECEDOR (SIPOC)"
  Set-SectionStyle $Sheet.Range("A$StartRow:K$StartRow") "Bahnschrift"
  $headerRow = $StartRow + 1
  [void]$Sheet.Range("A$headerRow:B$headerRow").Merge()
  [void]$Sheet.Range("C$headerRow:D$headerRow").Merge()
  [void]$Sheet.Range("E$headerRow:G$headerRow").Merge()
  [void]$Sheet.Range("H$headerRow:K$headerRow").Merge()
  Set-Text $Sheet.Range("A$headerRow") "FORNECEDORES"
  Set-Text $Sheet.Range("C$headerRow") "ENTRADAS"
  Set-Text $Sheet.Range("E$headerRow") "CLIENTES"
  Set-Text $Sheet.Range("H$headerRow") (U 'SA\u00CDDAS')
  Set-HeaderStyle $Sheet.Range("A$headerRow:K$headerRow") "Bahnschrift"

  for ($offset = 0; $offset -lt $rowCount; $offset++) {
    $row = $headerRow + 1 + $offset
    [void]$Sheet.Range("A$row:B$row").Merge()
    [void]$Sheet.Range("C$row:D$row").Merge()
    [void]$Sheet.Range("E$row:G$row").Merge()
    [void]$Sheet.Range("H$row:K$row").Merge()
    Set-Text $Sheet.Range("A$row") $(if ($offset -lt $suppliers.Count) { [string]$suppliers[$offset] } else { "" })
    Set-Text $Sheet.Range("C$row") $(if ($offset -lt $inputs.Count) { [string]$inputs[$offset] } else { "" })
    Set-Text $Sheet.Range("E$row") $(if ($offset -lt $clients.Count) { [string]$clients[$offset] } else { "" })
    Set-Text $Sheet.Range("H$row") $(if ($offset -lt $outputs.Count) { [string]$outputs[$offset] } else { "" })
    Set-BodyStyle $Sheet.Range("A$row:K$row") "Bahnschrift" 9
    $Sheet.Rows.Item($row).RowHeight = 31
  }
  return $headerRow + $rowCount + 1
}

function Write-Flow($Sheet, $Content, [int]$StartRow) {
  [void]$Sheet.Range("A$StartRow:K$StartRow").Merge()
  Set-Text $Sheet.Range("A$StartRow") "FLUXO DAS MACROETAPAS"
  Set-SectionStyle $Sheet.Range("A$StartRow:K$StartRow") "Bahnschrift"
  $row = $StartRow + 1
  $steps = Get-FlowSteps $Content
  if ($steps.Count -eq 0) {
    $steps = @($TextValidacao)
  }
  for ($index = 0; $index -lt $steps.Count; $index++) {
    [void]$Sheet.Range("A$row:K$row").Merge()
    Set-Text $Sheet.Range("A$row") (("{0:D2}" -f ($index + 1)) + "  " + [string]$steps[$index])
    $Sheet.Range("A$row:K$row").Interior.Color = $(if (($index % 2) -eq 0) { $ColorLightBlue } else { $ColorLightTeal })
    $Sheet.Range("A$row:K$row").Font.Name = "Bahnschrift"
    $Sheet.Range("A$row:K$row").Font.Size = 10
    $Sheet.Range("A$row:K$row").Font.Bold = $true
    $Sheet.Range("A$row:K$row").HorizontalAlignment = $xlCenter
    $Sheet.Range("A$row:K$row").VerticalAlignment = $xlCenter
    $Sheet.Range("A$row:K$row").WrapText = $true
    Set-AllBorders $Sheet.Range("A$row:K$row")
    $Sheet.Rows.Item($row).RowHeight = 29
    $row++
    if ($index -lt ($steps.Count - 1)) {
      [void]$Sheet.Range("A$row:K$row").Merge()
      Set-Text $Sheet.Range("A$row") (U '\u2193')
      $Sheet.Range("A$row:K$row").Font.Name = "Bahnschrift"
      $Sheet.Range("A$row:K$row").Font.Size = 14
      $Sheet.Range("A$row:K$row").Font.Bold = $true
      $Sheet.Range("A$row:K$row").Font.Color = $ColorNavy
      $Sheet.Range("A$row:K$row").HorizontalAlignment = $xlCenter
      $Sheet.Rows.Item($row).RowHeight = 18
      $row++
    }
  }
  return $row + 1
}

function Write-RiskLegend($Sheet, [int]$StartRow) {
  [void]$Sheet.Range("A$StartRow:K$StartRow").Merge()
  Set-Text $Sheet.Range("A$StartRow") (U 'ESCALAS E MATRIZ DE TOLERABILIDADE (P \u00D7 G)')
  Set-SectionStyle $Sheet.Range("A$StartRow:K$StartRow") "Bahnschrift"
  $row = $StartRow + 1

  [void]$Sheet.Range("A$row:E$row").Merge()
  [void]$Sheet.Range("F$row:K$row").Merge()
  Set-Text $Sheet.Range("A$row") "PROBABILIDADE"
  Set-Text $Sheet.Range("F$row") "GRAVIDADE"
  Set-HeaderStyle $Sheet.Range("A$row:K$row") "Bahnschrift"
  $row++

  $probability = @(
    @("1 - NUNCA", (U 'N\u00E3o ocorreu no hist\u00F3rico conhecido.')),
    @("2 - REMOTA", (U 'Pouco prov\u00E1vel; h\u00E1 controles consistentes.')),
    @("3 - INCOMUM", (U 'Pode ocorrer em situa\u00E7\u00F5es espec\u00EDficas.')),
    @("4 - OCASIONAL", (U 'Pode ocorrer ao longo da rotina.')),
    @("5 - FREQUENTE", (U 'Ocorre repetidamente ou \u00E9 muito prov\u00E1vel.'))
  )
  $severity = @(
    @("1 - SEM IMPACTO RELEVANTE", (U 'Retrabalho m\u00EDnimo, sem interrup\u00E7\u00E3o relevante.')),
    @("2 - BAIXA", (U 'Corre\u00E7\u00E3o simples e impacto limitado.')),
    @("3 - MODERADA", (U 'Afeta prazo ou qualidade e exige interven\u00E7\u00E3o.')),
    @("4 - ALTA", (U 'Impacto operacional, financeiro ou ao cliente relevante.')),
    @("5 - CR\u00CDTICA", (U 'Impacto grave em conformidade ou continuidade.'))
  )
  for ($index = 0; $index -lt 5; $index++) {
    [void]$Sheet.Range("A$row:B$row").Merge()
    [void]$Sheet.Range("C$row:E$row").Merge()
    [void]$Sheet.Range("F$row:G$row").Merge()
    [void]$Sheet.Range("H$row:K$row").Merge()
    Set-Text $Sheet.Range("A$row") (U ([string]$probability[$index][0]))
    Set-Text $Sheet.Range("C$row") (U ([string]$probability[$index][1]))
    Set-Text $Sheet.Range("F$row") (U ([string]$severity[$index][0]))
    Set-Text $Sheet.Range("H$row") (U ([string]$severity[$index][1]))
    Set-BodyStyle $Sheet.Range("A$row:K$row") "Bahnschrift" 8
    $Sheet.Rows.Item($row).RowHeight = 31
    $row++
  }

  $row++
  [void]$Sheet.Range("A$row:K$row").Merge()
  Set-Text $Sheet.Range("A$row") (U 'MATRIZ DE TOLERABILIDADE: 1\u20134 TOLER\u00C1VEL | 5\u201310 ALARP | 12 OU MAIS INACEIT\u00C1VEL')
  Set-HeaderStyle $Sheet.Range("A$row:K$row") "Bahnschrift"
  $row++
  Set-Text $Sheet.Range("A$row") "P \ G"
  for ($gravity = 1; $gravity -le 5; $gravity++) {
    Set-Text $Sheet.Cells.Item($row, $gravity + 1) [string]$gravity
  }
  Set-HeaderStyle $Sheet.Range("A$row:F$row") "Bahnschrift"
  for ($probabilityValue = 5; $probabilityValue -ge 1; $probabilityValue--) {
    $row++
    Set-Text $Sheet.Cells.Item($row, 1) [string]$probabilityValue
    $Sheet.Cells.Item($row, 1).Font.Bold = $true
    $Sheet.Cells.Item($row, 1).HorizontalAlignment = $xlCenter
    for ($gravity = 1; $gravity -le 5; $gravity++) {
      $score = $probabilityValue * $gravity
      $cell = $Sheet.Cells.Item($row, $gravity + 1)
      $cell.Value2 = $score
      $cell.HorizontalAlignment = $xlCenter
      $cell.Interior.Color = $(if ($score -le 4) { $ColorGreen } elseif ($score -le 10) { $ColorYellow } else { $ColorRed })
    }
    Set-AllBorders $Sheet.Range("A$row:F$row")
  }
  return $row + 1
}

function Build-MpWorkbook($Excel, $Content, [string]$TemplatePath, [string]$OutputPath) {
  Copy-Template $TemplatePath $OutputPath
  $workbook = $null
  $sheet = $null
  try {
    try {
      Invoke-TransientComRetry {
        $script:__openedWorkbook = $Excel.Workbooks.Open($OutputPath, 0, $false)
      } "abrir MP" 6
      $workbook = $script:__openedWorkbook
      if ($null -eq $workbook) {
        throw "O Excel retornou um workbook nulo."
      }
      $sheetCount = 0
      try { $sheetCount = @($workbook.Worksheets).Count } catch { $sheetCount = -1 }
      if ($sheetCount -eq 0) {
        throw "O Excel retornou um workbook sem planilha editavel."
      }
    } catch {
      throw "O Excel nao conseguiu abrir o modelo do MP. Confirme que o Excel desktop esta instalado, licenciado e sem janelas de dialogo abertas. Detalhe: $($_.Exception.Message)"
    }
    Set-CommonDocumentProperties $workbook
    $sheet = Reset-Workbook $workbook "MP"

    $widths = @(12, 17, 27, 24, 23, 6, 6, 8, 15, 23, 23)
    for ($index = 0; $index -lt $widths.Count; $index++) {
      $sheet.Columns.Item($index + 1).ColumnWidth = $widths[$index]
    }
    Set-MpMetadata $sheet $Content
    $mp = Get-PropertyValue $Content "mp" $null
    $row = Write-Sipoc $sheet $mp 6
    $row = Write-Flow $sheet $Content $row

    [void]$sheet.Range("A$row:K$row").Merge()
    Set-Text $sheet.Range("A$row") (U 'MAPA DE PROCESSO E MATRIZ DE RISCOS')
    Set-SectionStyle $sheet.Range("A$row:K$row") "Bahnschrift"
    $row++
    $headers = @("ETAPA", "QUEM FAZ", "COMO FAZ", "RISCO", "BARREIRA", "P", "G", (U 'P \u00D7 G'), $TextClassificacao, (U 'MITIGA\u00C7\u00C3O'), (U 'RESULTADO / INDICADOR'))
    for ($column = 1; $column -le $headers.Count; $column++) {
      Set-Text $sheet.Cells.Item($row, $column) ([string]$headers[$column - 1])
    }
    Set-HeaderStyle $sheet.Range("A$row:K$row") "Bahnschrift"
    $sheet.Rows.Item($row).RowHeight = 45
    $row++

    $risks = Get-ArrayValue $mp "riscos"
    if ($risks.Count -lt 1) {
      throw "O conteudo do MP deve conter ao menos um item em mp.riscos[]."
    }
    $firstRiskRow = $row
    $riskNumber = 0
    foreach ($risk in $risks) {
      $riskNumber++
      $suggested = Get-BoolValue $risk "sugerido" $false
      $riskId = Get-StringValue $risk "id" ("R{0:D2}" -f $riskNumber)
      $stageId = Get-StringValue $risk "etapa_id" ""
      $stage = Get-StringValue $risk "etapa" $TextValidacao
      $stageText = $(if ([string]::IsNullOrWhiteSpace($stageId)) { $stage } else { $stageId + " - " + $stage })
      if ($suggested) {
        $stageText = $stageText + " | " + (U 'RISCO SUGERIDO \u2014 PENDENTE DE VALIDA\u00C7\u00C3O')
      }
      $riskText = Get-StringValue $risk "risco" $TextValidacao
      $barrier = Get-StringValue $risk "barreira" $TextValidacao
      $mitigation = Get-StringValue $risk "mitigacao" ""
      $indicator = Get-StringValue $risk "resultado_indicador" ""

      Set-Text $sheet.Cells.Item($row, 1) ($riskId + " | " + $stageText)
      Set-Text $sheet.Cells.Item($row, 2) (Get-StringValue $risk "quem_faz" $TextValidacao)
      Set-Text $sheet.Cells.Item($row, 3) (Get-StringValue $risk "como_faz" $TextValidacao)
      Set-Text $sheet.Cells.Item($row, 4) $riskText
      Set-Text $sheet.Cells.Item($row, 5) $barrier

      # P and G always start empty. The process owner/Quality assigns them in Excel.
      $sheet.Cells.Item($row, 8).Formula = ('=IF(OR(F{0}="",G{0}=""),"",F{0}*G{0})' -f $row)
      $sheet.Cells.Item($row, 9).Formula = ('=IF(H{0}="","",IF(H{0}<=4,{1},IF(H{0}<=10,"ALARP",{2})))' -f $row, (Quote-FormulaText $TextToleravel), (Quote-FormulaText $TextInaceitavel))
      Set-Text $sheet.Cells.Item($row, 10) $mitigation
      Set-Text $sheet.Cells.Item($row, 11) $indicator

      Set-BodyStyle $sheet.Range("A$row:K$row") "Bahnschrift" 9
      if ($suggested) {
        $sheet.Range("A$row:K$row").Interior.Color = $ColorSuggested
      }
      $sheet.Range("F$row:G$row").Interior.Color = $ColorInput
      $sheet.Range("A$row:G$row").Locked = $false
      $sheet.Range("J$row:K$row").Locked = $false
      $sheet.Range("H$row:I$row").FormulaHidden = $true
      $sheet.Range("F$row:I$row").HorizontalAlignment = $xlCenter
      Add-RiskFormatting $sheet.Cells.Item($row, 8) $sheet.Cells.Item($row, 9)
      $sheet.Rows.Item($row).RowHeight = 72
      $row++
    }
    $lastRiskRow = $row - 1
    Add-WholeNumberValidation $sheet.Range("F$firstRiskRow:G$lastRiskRow")
    Add-WorkbookName $workbook "MP_PROBABILIDADE" (Get-AbsoluteReference "MP" "F" $firstRiskRow $lastRiskRow)
    Add-WorkbookName $workbook "MP_GRAVIDADE" (Get-AbsoluteReference "MP" "G" $firstRiskRow $lastRiskRow)
    Add-WorkbookName $workbook "MP_SCORE" (Get-AbsoluteReference "MP" "H" $firstRiskRow $lastRiskRow)

    $row++
    $row = Write-RiskLegend $sheet $row
    $sheet.Range("A1:K" + ($row - 1)).Font.Name = "Bahnschrift"
    $sheet.PageSetup.PrintArea = '$A$1:$K$' + ($row - 1)
    $sheet.PageSetup.Orientation = $xlLandscape
    $sheet.PageSetup.Zoom = $false
    $sheet.PageSetup.FitToPagesWide = 1
    $sheet.PageSetup.FitToPagesTall = $false
    $sheet.PageSetup.CenterHorizontally = $true
    $sheet.PageSetup.LeftMargin = $Excel.InchesToPoints(0.2)
    $sheet.PageSetup.RightMargin = $Excel.InchesToPoints(0.2)
    $sheet.PageSetup.TopMargin = $Excel.InchesToPoints(0.35)
    $sheet.PageSetup.BottomMargin = $Excel.InchesToPoints(0.35)
    $sheet.PageSetup.CenterFooter = U 'P\u00E1gina &P de &N'
    $sheet.Protect("", $false, $true, $true)
    $sheet.EnableSelection = $xlUnlockedCells

    $Excel.CalculateFullRebuild()
    Invoke-TransientComRetry { $workbook.Save() } "salvar MP"
  } finally {
    if ($null -ne $sheet) {
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($sheet)
    }
    if ($null -ne $workbook) {
      try {
        Invoke-TransientComRetry { $workbook.Close($false) } "fechar MP"
      } catch {
        Write-Warning ("Nao foi possivel fechar o workbook do MP: " + $_.Exception.Message)
      }
      [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($workbook)
    }
  }
}

$contentPath = Get-FullPath $ContentJson
if (-not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
  throw "JSON de conteudo nao localizado: $contentPath"
}
$outDir = Get-FullPath $OutputDir
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$templatesDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\templates"))
$formTemplate = Join-Path $templatesDir "FORM-template.xlsx"
$mpTemplate = Join-Path $templatesDir "MP-template.xlsx"
$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $contentPath | ConvertFrom-Json

$selected = @()
$documentTypesWereProvided = $PSBoundParameters.ContainsKey("DocumentTypes")
foreach ($item in @($DocumentTypes)) {
  foreach ($token in ([string]$item -split ',')) {
    $normalized = $token.Trim().ToUpperInvariant()
    if ($normalized -in @("FORM", "MP") -and $selected -notcontains $normalized) {
      $selected += $normalized
    }
  }
}
if ($selected.Count -eq 0 -and -not $documentTypesWereProvided) {
  foreach ($item in (Get-ArrayValue $content "documentos_solicitados")) {
    $normalized = ([string]$item).Trim().ToUpperInvariant()
    if ($normalized -in @("FORM", "MP") -and $selected -notcontains $normalized) {
      $selected += $normalized
    }
  }
}
if ($selected.Count -eq 0 -and -not $documentTypesWereProvided) {
  if ($null -ne (Get-PropertyValue $content "form" $null)) { $selected += "FORM" }
  if ($null -ne (Get-PropertyValue $content "mp" $null)) { $selected += "MP" }
}
if ($selected.Count -eq 0) {
  Write-Output "Nenhum documento Excel foi solicitado."
  exit 0
}

function New-ExcelApplication {
  # Prefer a fresh Excel instance (/x) without default workbook UI (/e). On some
  # desktops New-Object Excel.Application accepts property sets but rejects
  # Workbooks.Open with RPC_E_CALL_REJECTED until Excel is started this way.
  $excelProcess = $null
  try {
    $excelProcess = Start-Process -FilePath "excel.exe" -ArgumentList @("/x", "/e") -PassThru
    Start-Sleep -Seconds 6
    $deadline = (Get-Date).AddSeconds(30)
    $instance = $null
    while ((Get-Date) -lt $deadline) {
      try {
        $instance = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
        break
      } catch {
        Start-Sleep -Milliseconds 750
      }
    }
    if ($null -eq $instance) {
      throw "Nao foi possivel anexar a uma instancia do Excel iniciada com /x /e."
    }
    # Deixa visivel só o tempo suficiente para estabilizar o COM; o chamador pode ocultar depois.
    try { $instance.Visible = $true } catch { }
    Start-Sleep -Seconds 2
    return $instance
  } catch {
    if ($null -ne $excelProcess -and -not $excelProcess.HasExited) {
      try { Stop-Process -Id $excelProcess.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
    return (New-Object -ComObject Excel.Application)
  }
}

$excel = $null
try {
  $excel = New-ExcelApplication
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.AskToUpdateLinks = $false
  $excel.EnableEvents = $false
  $excel.ScreenUpdating = $false
  $listSeparator = [string]$excel.International(5)

  if ($selected -contains "FORM") {
    $formFile = Get-OutputFileName $content "arquivo_form" "FORM.XXX.XXX - Formulario de Verificacao.xlsx" "FORM"
    $formOutput = Join-Path $outDir $formFile
    Build-FormWorkbook $excel $content $formTemplate $formOutput $listSeparator
    Write-Output ("FORM=" + $formOutput)
  }
  if ($selected -contains "MP") {
    $mpFile = Get-OutputFileName $content "arquivo_mp" "MP.XXX.XXX - Mapeamento de Processo.xlsx" "MP"
    $mpOutput = Join-Path $outDir $mpFile
    Build-MpWorkbook $excel $content $mpTemplate $mpOutput
    Write-Output ("MP=" + $mpOutput)
  }
} finally {
  if ($null -ne $excel) {
    try { $excel.EnableEvents = $true } catch { }
    try { $excel.ScreenUpdating = $true } catch { }
    try {
      Invoke-TransientComRetry { $excel.Quit() } "encerrar Excel"
    } catch {
      Write-Warning ("Nao foi possivel encerrar o Excel: " + $_.Exception.Message)
    }
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
