Set-StrictMode -Version 2.0

function Get-FullPath {
  param([Parameter(Mandatory=$true)][string]$PathValue, [string]$BasePath = (Get-Location).Path)

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $PathValue))
}

function Get-PropertyValue {
  param($Object, [Parameter(Mandatory=$true)][string]$Name, $Default = $null)

  if ($null -eq $Object) { return $Default }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) { return $Default }
  return $property.Value
}

function Test-HasValue {
  param($Value)

  if ($null -eq $Value) { return $false }
  if ($Value -is [string]) { return -not [string]::IsNullOrWhiteSpace($Value) }
  if ($Value -is [System.Collections.IEnumerable]) {
    foreach ($item in $Value) {
      if (Test-HasValue $item) { return $true }
    }
    return $false
  }
  return $true
}

function ConvertTo-ItemArray {
  param($Value)

  if ($null -eq $Value) { return @() }
  if ($Value -is [string]) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
    return @([string]$Value)
  }
  return @($Value)
}

function ConvertTo-StringArray {
  param($Value)

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($item in (ConvertTo-ItemArray $Value)) {
    if ($null -eq $item) { continue }
    $text = ([string]$item).Trim()
    if ($text.Length -gt 0) { $items.Add($text) }
  }
  return @($items.ToArray())
}

function Get-FirstValue {
  param([Parameter(Mandatory=$true)][AllowNull()][object[]]$Values, $Default = $null)

  foreach ($value in $Values) {
    if (Test-HasValue $value) { return $value }
  }
  return $Default
}

function ConvertTo-DocumentType {
  param([Parameter(Mandatory=$true)][string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  switch ($normalized) {
    { $_ -in @('pop', 'pr', 'procedimento') } { return 'pop' }
    { $_ -in @('it', 'in', 'instrucao', 'instrução') } { return 'it' }
    { $_ -in @('form', 'formulario', 'formulário') } { return 'form' }
    { $_ -in @('mp', 'mapeamento') } { return 'mp' }
    default { throw "Tipo de documento inválido: $Value" }
  }
}

function Assert-SafeLeafName {
  param(
    [Parameter(Mandatory=$true)][string]$FileName,
    [Parameter(Mandatory=$true)][string]$ExpectedExtension
  )

  if ([string]::IsNullOrWhiteSpace($FileName)) { throw 'Nome de arquivo vazio.' }
  if ([System.IO.Path]::GetFileName($FileName) -ne $FileName) {
    throw "O nome de saída deve ser apenas um arquivo, sem diretórios: $FileName"
  }
  if ([System.IO.Path]::GetExtension($FileName).ToLowerInvariant() -ne $ExpectedExtension.ToLowerInvariant()) {
    throw "Extensão inválida para $FileName. Esperado: $ExpectedExtension"
  }
  if ($FileName.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
    throw "Nome de arquivo inválido: $FileName"
  }
  return $FileName
}

function Assert-CodePrefix {
  param(
    [Parameter(Mandatory=$true)][string]$Code,
    [Parameter(Mandatory=$true)][string]$Prefix,
    [Parameter(Mandatory=$true)][string]$Label
  )

  if ([string]::IsNullOrWhiteSpace($Code) -or
      -not $Code.Trim().StartsWith(($Prefix + '.'), [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label deve começar com '$Prefix.': $Code"
  }
}

function Get-DefaultFileName {
  param(
    [Parameter(Mandatory=$true)][string]$Code,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Extension
  )

  $safeTitle = $Title
  foreach ($character in [System.IO.Path]::GetInvalidFileNameChars()) {
    $safeTitle = $safeTitle.Replace([string]$character, '-')
  }
  return (($Code.Trim() + ' - ' + $safeTitle.Trim()) + $Extension)
}

function Get-LegacyPrint {
  param($Prints, [string]$Id)

  if ([string]::IsNullOrWhiteSpace($Id)) { return $null }
  foreach ($print in (ConvertTo-ItemArray $Prints)) {
    if ([string](Get-PropertyValue $print 'id' '') -eq $Id) { return $print }
  }
  return $null
}

function ConvertTo-NormalizedContent {
  param([Parameter(Mandatory=$true)]$Raw)

  $document = Get-PropertyValue $Raw 'documento' ([PSCustomObject]@{})
  $output = Get-PropertyValue $Raw 'saida' ([PSCustomObject]@{})
  $sectorCode = [string](Get-FirstValue @(
    (Get-PropertyValue $document 'sigla_setor' $null),
    (Get-PropertyValue $Raw 'sigla_setor' $null)
  ) 'XXX')
  $number = [string](Get-FirstValue @(
    (Get-PropertyValue $document 'numero' $null),
    (Get-PropertyValue $Raw 'numero' $null)
  ) 'XXX')

  $title = [string](Get-FirstValue @((Get-PropertyValue $document 'titulo' $null), 'PROCESSO PARA VALIDAÇÃO'))
  $codes = [ordered]@{
    codigo_pop = [string](Get-FirstValue @((Get-PropertyValue $document 'codigo_pop' $null), "PR.$sectorCode.$number"))
    codigo_it = [string](Get-FirstValue @((Get-PropertyValue $document 'codigo_it' $null), "IN.$sectorCode.$number"))
    codigo_form = [string](Get-FirstValue @((Get-PropertyValue $document 'codigo_form' $null), "FORM.$sectorCode.$number"))
    codigo_mp = [string](Get-FirstValue @((Get-PropertyValue $document 'codigo_mp' $null), "MP.$sectorCode.$number"))
  }
  Assert-CodePrefix $codes.codigo_pop 'PR' 'Código POP/PR'
  Assert-CodePrefix $codes.codigo_it 'IN' 'Código IT/IN'
  Assert-CodePrefix $codes.codigo_form 'FORM' 'Código FORM'
  Assert-CodePrefix $codes.codigo_mp 'MP' 'Código MP'

  $requestedRaw = Get-FirstValue @(
    (Get-PropertyValue $Raw 'documentos_solicitados' $null),
    (Get-PropertyValue $output 'gerar' $null)
  ) @('pop', 'it')
  $requested = New-Object System.Collections.Generic.List[string]
  foreach ($item in (ConvertTo-StringArray $requestedRaw)) {
    $type = ConvertTo-DocumentType $item
    if (-not $requested.Contains($type)) { $requested.Add($type) }
  }
  if ($requested.Count -eq 0) { throw 'Selecione ao menos um documento para gerar.' }

  $files = [ordered]@{
    arquivo_pop = [string](Get-FirstValue @((Get-PropertyValue $output 'arquivo_pop' $null), (Get-DefaultFileName $codes.codigo_pop $title '.docx')))
    arquivo_it = [string](Get-FirstValue @((Get-PropertyValue $output 'arquivo_it' $null), (Get-DefaultFileName $codes.codigo_it $title '.docx')))
    arquivo_form = [string](Get-FirstValue @((Get-PropertyValue $output 'arquivo_form' $null), (Get-DefaultFileName $codes.codigo_form $title '.xlsx')))
    arquivo_mp = [string](Get-FirstValue @((Get-PropertyValue $output 'arquivo_mp' $null), (Get-DefaultFileName $codes.codigo_mp $title '.xlsx')))
  }
  Assert-SafeLeafName $files.arquivo_pop '.docx' | Out-Null
  Assert-SafeLeafName $files.arquivo_it '.docx' | Out-Null
  Assert-SafeLeafName $files.arquivo_form '.xlsx' | Out-Null
  Assert-SafeLeafName $files.arquivo_mp '.xlsx' | Out-Null

  $popSource = Get-PropertyValue (Get-PropertyValue $Raw 'pop' ([PSCustomObject]@{})) 'etapas' @()
  $popSteps = New-Object System.Collections.Generic.List[object]
  $knownIds = @{}
  $index = 0
  foreach ($step in (ConvertTo-ItemArray $popSource)) {
    $index++
    $id = [string](Get-FirstValue @((Get-PropertyValue $step 'id' $null), ('E{0:d2}' -f $index)))
    if ($knownIds.ContainsKey($id)) { throw "ID de etapa duplicado no POP: $id" }
    $knownIds[$id] = $true
    $popSteps.Add([PSCustomObject][ordered]@{
      id = $id
      o_que = [string](Get-PropertyValue $step 'o_que' '')
      como = [string](Get-PropertyValue $step 'como' '')
      setor = [string](Get-FirstValue @((Get-PropertyValue $step 'setor' $null), (Get-PropertyValue $document 'setor' $null), 'Ponto para validação: confirmar setor responsável.'))
      registro = [string](Get-PropertyValue $step 'registro' '')
    })
  }

  $legacyPrints = Get-PropertyValue $Raw 'prints' @()
  $itSource = Get-PropertyValue (Get-PropertyValue $Raw 'it' ([PSCustomObject]@{})) 'secoes' @()
  $itSections = New-Object System.Collections.Generic.List[object]
  $normalizationPending = New-Object System.Collections.Generic.List[string]
  $knownItIds = @{}
  $index = 0
  foreach ($section in (ConvertTo-ItemArray $itSource)) {
    $index++
    $id = [string](Get-FirstValue @(
      (Get-PropertyValue $section 'id' $null),
      (Get-PropertyValue $section 'etapa_id' $null),
      (Get-PropertyValue $section 'print_id' $null),
      ('E{0:d2}' -f $index)
    ))
    if ([string]::IsNullOrWhiteSpace($id)) { throw "ID vazio na seção $index da IT." }
    if ($knownItIds.ContainsKey($id)) { throw "ID de seção duplicado na IT: $id" }
    $knownItIds[$id] = $true
    $legacyParagraphs = ConvertTo-StringArray (Get-PropertyValue $section 'paragrafos' @())
    $pathValue = [string](Get-PropertyValue $section 'caminho' '')
    $instructions = New-Object System.Collections.Generic.List[string]
    $attentions = New-Object System.Collections.Generic.List[string]

    $explicitInstructions = Get-FirstValue @(
      (Get-PropertyValue $section 'instrucoes' $null),
      (Get-PropertyValue $section 'passo_a_passo' $null)
    ) @()
    foreach ($line in (ConvertTo-StringArray $explicitInstructions)) { $instructions.Add($line) }
    foreach ($line in $legacyParagraphs) {
      if ($line -match '^(?i)Caminho\s*:\s*(.+)$') {
        if ([string]::IsNullOrWhiteSpace($pathValue)) { $pathValue = $Matches[1].Trim() }
      } elseif ($line -match '^(?i)(Ponto de atenção|Atenção)\s*:\s*(.+)$') {
        $attentions.Add($Matches[2].Trim())
      } elseif ($line -match '^(?i)Ponto para validação\s*:') {
        continue
      } elseif ($line -match '^(?i)COMO\s*:\s*(.+)$') {
        $instructions.Add($Matches[1].Trim())
      } else {
        $instructions.Add($line)
      }
    }
    foreach ($line in (ConvertTo-StringArray (Get-PropertyValue $section 'atencoes' @()))) {
      if (-not $attentions.Contains($line)) { $attentions.Add($line) }
    }
    if ($instructions.Count -eq 0) {
      foreach ($line in (ConvertTo-StringArray (Get-PropertyValue $section 'antes_de_comecar' @()))) { $instructions.Add($line) }
    }

    $fieldSource = Get-PropertyValue $section 'campo_print' $null
    $legacyPrintId = [string](Get-PropertyValue $section 'print_id' '')
    $legacyPrint = Get-LegacyPrint $legacyPrints $legacyPrintId
    $hasField = ($null -ne $fieldSource) -or (-not [string]::IsNullOrWhiteSpace($legacyPrintId))
    $fieldId = [string](Get-FirstValue @((Get-PropertyValue $fieldSource 'id' $null), $legacyPrintId, $id))
    $legacyCaption = if ($null -ne $legacyPrint) { [string](Get-PropertyValue $legacyPrint 'caption' '') } else { '' }
    $caption = [string](Get-FirstValue @((Get-PropertyValue $fieldSource 'legenda' $null), $legacyCaption, "Imagem - evidência da etapa $id."))
    $stageReference = [string](Get-FirstValue @((Get-PropertyValue $section 'etapa_id' $null), $id))
    if ($knownIds.Count -gt 0 -and -not $knownIds.ContainsKey($stageReference)) {
      $prefixedReference = 'E' + $stageReference.TrimStart('E', 'e')
      if ($knownIds.ContainsKey($prefixedReference)) {
        $stageReference = $prefixedReference
      } elseif ($index -le $popSteps.Count) {
        # JSONs antigos frequentemente relacionavam IT e POP apenas pela ordem
        # e usavam print_id "01" em vez do ID estável "E01".
        $stageReference = [string]$popSteps[$index - 1].id
      } else {
        # Uma macroetapa antiga pode reunir várias seções detalhadas da IT.
        # Sem relação explícita, mantenha as seções excedentes ligadas à última
        # macroetapa, deixando a revisão semântica registrada nas pendências.
        $stageReference = [string]$popSteps[$popSteps.Count - 1].id
        $compatibilityNote = 'Ponto para validação: confirmar a relação entre as seções detalhadas da IT legada e as macroetapas do POP.'
        if (-not $normalizationPending.Contains($compatibilityNote)) { $normalizationPending.Add($compatibilityNote) }
      }
    }
    $itSections.Add([PSCustomObject][ordered]@{
      id = $id
      etapa_id = $stageReference
      titulo = [string](Get-PropertyValue $section 'titulo' ("$index. ETAPA"))
      caminho = $pathValue
      instrucoes = @($instructions.ToArray())
      atencoes = @($attentions.ToArray())
      campo_print = [PSCustomObject][ordered]@{
        incluir = [bool](Get-FirstValue @((Get-PropertyValue $fieldSource 'incluir' $null), $hasField) $false)
        id = $fieldId
        rotulo = [string](Get-FirstValue @((Get-PropertyValue $fieldSource 'rotulo' $null), 'CLIQUE PARA INSERIR O PRINT'))
        orientacao = [string](Get-FirstValue @((Get-PropertyValue $fieldSource 'orientacao' $null), 'Inserir uma captura legível da ação ou do resultado desta etapa.'))
        legenda = $caption
        obrigatorio = [bool](Get-PropertyValue $fieldSource 'obrigatorio' $false)
      }
    })
  }

  $formRaw = Get-PropertyValue $Raw 'form' ([PSCustomObject]@{})
  $formBlocksRaw = Get-PropertyValue $formRaw 'blocos' @()
  $formBlocks = New-Object System.Collections.Generic.List[object]
  $knownFormIds = @{}
  $index = 0
  foreach ($block in (ConvertTo-ItemArray $formBlocksRaw)) {
    $index++
    $blockId = [string](Get-PropertyValue $block 'id' ('B{0:d2}' -f $index))
    if ([string]::IsNullOrWhiteSpace($blockId)) { throw "ID vazio no bloco $index do FORM." }
    if ($knownFormIds.ContainsKey($blockId)) { throw "ID de bloco duplicado no FORM: $blockId" }
    $knownFormIds[$blockId] = $true
    $items = New-Object System.Collections.Generic.List[object]
    $knownItemIds = @{}
    $itemIndex = 0
    foreach ($item in (ConvertTo-ItemArray (Get-PropertyValue $block 'itens' @()))) {
      $itemIndex++
      if ($item -is [string]) {
        $question = [string]$item
        $itemId = ('C{0:d2}' -f $itemIndex)
        $conform = 'SIM'
      } else {
        $question = [string](Get-FirstValue @((Get-PropertyValue $item 'pergunta' $null), (Get-PropertyValue $item 'criterio' $null), ''))
        $itemId = [string](Get-PropertyValue $item 'id' ('C{0:d2}' -f $itemIndex))
        $conform = [string](Get-PropertyValue $item 'resposta_conforme' 'SIM')
      }
      if (-not [string]::IsNullOrWhiteSpace($question)) {
        if ($knownItemIds.ContainsKey($itemId)) { throw "ID de pergunta duplicado no bloco $blockId do FORM: $itemId" }
        $knownItemIds[$itemId] = $true
        $items.Add([PSCustomObject][ordered]@{ id = $itemId; pergunta = $question; resposta_conforme = $conform })
      }
    }
    $etapaIdsRaw = @(ConvertTo-ItemArray (Get-PropertyValue $block 'etapa_ids' @()))
    $etapaIds = New-Object System.Collections.Generic.List[string]
    $primaryEtapa = [string](Get-PropertyValue $block 'etapa_id' ('E{0:d2}' -f $index))
    if (-not [string]::IsNullOrWhiteSpace($primaryEtapa)) {
      [void]$etapaIds.Add($primaryEtapa)
    }
    foreach ($extraEtapa in $etapaIdsRaw) {
      $extra = [string]$extraEtapa
      if (-not [string]::IsNullOrWhiteSpace($extra) -and -not $etapaIds.Contains($extra)) {
        [void]$etapaIds.Add($extra)
      }
    }
    $formBlocks.Add([PSCustomObject][ordered]@{
      id = $blockId
      etapa_id = $primaryEtapa
      etapa_ids = @($etapaIds.ToArray())
      titulo = [string](Get-PropertyValue $block 'titulo' ("$index. ETAPA"))
      setor = [string](Get-FirstValue @((Get-PropertyValue $block 'setor' $null), (Get-PropertyValue $document 'setor' $null), 'Ponto para validação'))
      itens = @($items.ToArray())
      campo_evidencia = [bool](Get-PropertyValue $block 'campo_evidencia' $true)
    })
  }
  if ($formBlocks.Count -eq 0) {
    $index = 0
    foreach ($section in $itSections) {
      $index++
      $items = New-Object System.Collections.Generic.List[object]
      $itemIndex = 0
      foreach ($instruction in $section.instrucoes) {
        $itemIndex++
        $items.Add([PSCustomObject][ordered]@{
          id = ('C{0:d2}' -f $itemIndex)
          pergunta = ([string]$instruction).TrimEnd('.')
          resposta_conforme = 'SIM'
        })
      }
      $formBlocks.Add([PSCustomObject][ordered]@{
        id = ('B{0:d2}' -f $index)
        etapa_id = $section.etapa_id
        titulo = $section.titulo
        setor = [string](Get-FirstValue @((Get-PropertyValue $document 'setor' $null), 'Ponto para validação'))
        itens = @($items.ToArray())
        campo_evidencia = $true
      })
    }
  }

  $mpRaw = Get-PropertyValue $Raw 'mp' ([PSCustomObject]@{})
  $chainRaw = Get-FirstValue @((Get-PropertyValue $mpRaw 'cadeia' $null), (Get-PropertyValue $mpRaw 'cadeia_cliente_fornecedor' $null)) ([PSCustomObject]@{})
  $risks = New-Object System.Collections.Generic.List[object]
  $knownRiskIds = @{}
  $riskIndex = 0
  foreach ($risk in (ConvertTo-ItemArray (Get-PropertyValue $mpRaw 'riscos' @()))) {
    $riskIndex++
    $riskId = [string](Get-PropertyValue $risk 'id' ('R{0:d2}' -f $riskIndex))
    if ([string]::IsNullOrWhiteSpace($riskId)) { throw "ID vazio no risco $riskIndex do MP." }
    if ($knownRiskIds.ContainsKey($riskId)) { throw "ID de risco duplicado no MP: $riskId" }
    $knownRiskIds[$riskId] = $true
    $suggested = [bool](Get-PropertyValue $risk 'sugerido' $true)
    # P/G: valores do JSON quando informados; senao padrao automatico para classificacao visual.
    $rawP = Get-PropertyValue $risk 'probabilidade' $null
    $rawG = Get-PropertyValue $risk 'gravidade' $null
    if ($null -eq $rawP -or [string]::IsNullOrWhiteSpace([string]$rawP)) {
      $probability = $(if ($suggested) { 3 } else { 2 })
    } else {
      $probability = [int]$rawP
    }
    if ($null -eq $rawG -or [string]::IsNullOrWhiteSpace([string]$rawG)) {
      $gravity = 3
    } else {
      $gravity = [int]$rawG
    }
    $mitigation = [string](Get-PropertyValue $risk 'mitigacao' '')
    $indicator = [string](Get-PropertyValue $risk 'resultado_indicador' '')
    if ($suggested) {
      if ([string]::IsNullOrWhiteSpace($mitigation)) { $mitigation = '' }
      if ([string]::IsNullOrWhiteSpace($indicator)) { $indicator = '' }
    }
    $risks.Add([PSCustomObject][ordered]@{
      id = $riskId
      etapa_id = [string](Get-PropertyValue $risk 'etapa_id' '')
      etapa = [string](Get-PropertyValue $risk 'etapa' '')
      quem_faz = [string](Get-PropertyValue $risk 'quem_faz' '')
      como_faz = [string](Get-PropertyValue $risk 'como_faz' '')
      risco = [string](Get-PropertyValue $risk 'risco' '')
      barreira = [string](Get-PropertyValue $risk 'barreira' '')
      probabilidade = $probability
      gravidade = $gravity
      mitigacao = $mitigation
      resultado_indicador = $indicator
      sugerido = $suggested
    })
  }

  # Validação cruzada do contrato antes de qualquer automação do Office.
  if ($requested.Contains('pop') -and $popSteps.Count -eq 0) { throw 'O POP solicitado não possui etapas.' }
  if ($requested.Contains('it') -and $itSections.Count -eq 0) { throw 'A IT solicitada não possui seções.' }
  if ($requested.Contains('form') -and $formBlocks.Count -eq 0) { throw 'O FORM solicitado não possui blocos.' }
  if ($requested.Contains('mp') -and $risks.Count -eq 0) { throw 'O MP solicitado não possui riscos.' }

  $stageIds = @{}
  foreach ($step in $popSteps) { $stageIds[[string]$step.id] = $true }
  if ($stageIds.Count -eq 0) {
    foreach ($section in $itSections) { $stageIds[[string]$section.etapa_id] = $true }
  }
  if ($popSteps.Count -gt 0) {
    foreach ($section in $itSections) {
      if (-not $stageIds.ContainsKey([string]$section.etapa_id)) {
        throw "A seção IT $($section.id) referencia uma etapa POP inexistente: $($section.etapa_id)"
      }
    }
  }
  foreach ($block in $formBlocks) {
    if ($stageIds.Count -gt 0 -and -not $stageIds.ContainsKey([string]$block.etapa_id)) {
      throw "O bloco FORM $($block.id) referencia uma etapa inexistente: $($block.etapa_id)"
    }
    if ($block.itens.Count -eq 0) { throw "O bloco FORM $($block.id) não possui perguntas verificáveis." }
  }
  foreach ($risk in $risks) {
    if (-not [string]::IsNullOrWhiteSpace([string]$risk.etapa_id) -and
        $stageIds.Count -gt 0 -and
        -not $stageIds.ContainsKey([string]$risk.etapa_id)) {
      throw "O risco MP $($risk.id) referencia uma etapa inexistente: $($risk.etapa_id)"
    }
  }
  if ($requested.Contains('mp')) {
    foreach ($chainName in @('fornecedores', 'entradas', 'clientes', 'saidas')) {
      if (@(ConvertTo-StringArray (Get-PropertyValue $chainRaw $chainName @())).Count -eq 0) {
        throw "O MP solicitado não possui dados em cadeia.$chainName."
      }
    }
  }

  $pending = New-Object System.Collections.Generic.List[string]
  foreach ($item in $normalizationPending) { $pending.Add($item) }
  foreach ($item in (ConvertTo-StringArray (Get-PropertyValue $Raw 'pontos_validacao' @()))) {
    if (-not $pending.Contains($item)) { $pending.Add($item) }
  }

  $pendingCodes = New-Object System.Collections.Generic.List[string]
  foreach ($entry in @(
    [PSCustomObject]@{ Label = 'POP'; Value = $codes.codigo_pop; Type = 'pop' },
    [PSCustomObject]@{ Label = 'IT'; Value = $codes.codigo_it; Type = 'it' },
    [PSCustomObject]@{ Label = 'FORM'; Value = $codes.codigo_form; Type = 'form' },
    [PSCustomObject]@{ Label = 'MP'; Value = $codes.codigo_mp; Type = 'mp' }
  )) {
    if ($requested.Contains($entry.Type) -and $entry.Value -match '(?i)(XXX|XX/XX)') {
      $pendingCodes.Add($entry.Label)
    }
  }
  if ($pendingCodes.Count -gt 0) {
    $text = 'Ponto para validação: confirmar códigos oficiais (' + (($pendingCodes.ToArray()) -join '/') + ') e numeração do documento.'
    if (-not $pending.Contains($text)) { $pending.Add($text) }
  }

  $pendingRoles = New-Object System.Collections.Generic.List[string]
  foreach ($entry in @(
    [PSCustomObject]@{ Label = 'setor'; Value = [string](Get-PropertyValue $document 'setor' '') },
    [PSCustomObject]@{ Label = 'elaborador'; Value = [string](Get-PropertyValue $document 'elaborador' '') },
    [PSCustomObject]@{ Label = 'verificador'; Value = [string](Get-PropertyValue $document 'verificador' '') },
    [PSCustomObject]@{ Label = 'aprovador'; Value = [string](Get-PropertyValue $document 'aprovador' '') }
  )) {
    if ($entry.Value -match '(?i)(XXX|XX/XX|Ponto para validação|#Ponto)') {
      $pendingRoles.Add($entry.Label)
    }
  }
  if ($pendingRoles.Count -gt 0) {
    $text = 'Ponto para validação: confirmar ' + (($pendingRoles.ToArray()) -join ', ') + '.'
    if (-not $pending.Contains($text)) { $pending.Add($text) }
  }

  $suggestedRiskIds = @(
    $risks | Where-Object { $_.sugerido } | ForEach-Object { [string]$_.id }
  )
  if ($suggestedRiskIds.Count -gt 0) {
    $text = 'Ponto para validação: revisar P/G dos riscos sugeridos no MP (' + ($suggestedRiskIds -join ', ') + ').'
    if (-not $pending.Contains($text)) { $pending.Add($text) }
  }

  $pending = @(Compress-ValidationPoints -Items @($pending.ToArray()))

  $normalizedDocument = [PSCustomObject][ordered]@{
    titulo = $title.ToUpperInvariant()
    codigo_pop = $codes.codigo_pop
    codigo_it = $codes.codigo_it
    codigo_form = $codes.codigo_form
    codigo_mp = $codes.codigo_mp
    sigla_setor = $sectorCode
    numero = $number
    setor = [string](Get-PropertyValue $document 'setor' 'Ponto para validação: confirmar setor responsável.')
    emissao = [string](Get-PropertyValue $document 'emissao' 'XX/XX/XXXX')
    revisao = [string](Get-PropertyValue $document 'revisao' 'XX/XX/XXXX')
    versao = [string](Get-PropertyValue $document 'versao' '00')
    elaborador = [string](Get-PropertyValue $document 'elaborador' '#Ponto para validação#')
    verificador = [string](Get-PropertyValue $document 'verificador' '#Ponto para validação#')
    aprovador = [string](Get-PropertyValue $document 'aprovador' '#Ponto para validação#')
    objetivo = [string](Get-PropertyValue $document 'objetivo' '')
    resultado_esperado = [string](Get-PropertyValue $document 'resultado_esperado' '')
    frequencia = [string](Get-FirstValue @((Get-PropertyValue $document 'frequencia' $null), (Get-PropertyValue $formRaw 'frequencia' $null), 'Sob demanda'))
  }

  $transcriptionRaw = Get-PropertyValue $Raw 'transcricao' ([PSCustomObject]@{ status = 'fornecida'; idioma = 'pt' })
  $transcriptionStatusRaw = [string](Get-PropertyValue $transcriptionRaw 'status' 'fornecida')
  $transcriptionPendingCode = [string](Get-PropertyValue $transcriptionRaw 'pending_code' '')
  $transcriptionStatus = switch ($transcriptionStatusRaw.Trim().ToLowerInvariant()) {
    { $_ -in @('fornecida', 'provided') } { 'fornecida'; break }
    { $_ -in @('success', 'concluida', 'concluído', 'concluido') } { 'concluida'; break }
    { $_ -in @('sem_audio', 'no_audio') -or $transcriptionPendingCode -eq 'NO_AUDIO_STREAM' } { 'sem_audio'; break }
    { $_ -in @('failed', 'falhou', 'error', 'erro') } { 'falhou'; break }
    default { 'inconclusiva' }
  }
  $normalizedTranscription = [PSCustomObject][ordered]@{
    status = $transcriptionStatus
    idioma = [string](Get-FirstValue @((Get-PropertyValue $transcriptionRaw 'idioma' $null), (Get-PropertyValue $transcriptionRaw 'language' $null), 'pt'))
    observacao = [string](Get-FirstValue @((Get-PropertyValue $transcriptionRaw 'observacao' $null), (Get-PropertyValue $transcriptionRaw 'pending_reason' $null), ''))
  }

  $listaMestra = Build-ListaMestraEntries `
    -Requested $requested `
    -Document $normalizedDocument `
    -Files $files `
    -Complementar @(ConvertTo-StringArray (Get-PropertyValue $Raw 'documentacao_complementar' @())) `
    -RawLista (Get-PropertyValue $Raw 'lista_mestra' $null)

  return [PSCustomObject][ordered]@{
    schema_version = '2.0'
    documentos_solicitados = @($requested.ToArray())
    saida = [PSCustomObject]$files
    documento = $normalizedDocument
    abreviaturas = @(ConvertTo-StringArray (Get-PropertyValue $Raw 'abreviaturas' @()))
    documentacao_complementar = @(ConvertTo-StringArray (Get-PropertyValue $Raw 'documentacao_complementar' @()))
    pop = [PSCustomObject]@{ etapas = @($popSteps.ToArray()) }
    it = [PSCustomObject]@{ perfil_redacao = 'passo_a_passo'; secoes = @($itSections.ToArray()) }
    form = [PSCustomObject]@{
      campos_contexto = @(ConvertTo-ItemArray (Get-PropertyValue $formRaw 'campos_contexto' @()))
      prazo_dias = Get-PropertyValue $formRaw 'prazo_dias' $null
      blocos = @($formBlocks.ToArray())
      observacoes = @(ConvertTo-StringArray (Get-PropertyValue $formRaw 'observacoes' @()))
    }
    mp = [PSCustomObject]@{
      cadeia = [PSCustomObject]@{
        fornecedores = @(ConvertTo-StringArray (Get-PropertyValue $chainRaw 'fornecedores' @()))
        entradas = @(ConvertTo-StringArray (Get-PropertyValue $chainRaw 'entradas' @()))
        clientes = @(ConvertTo-StringArray (Get-PropertyValue $chainRaw 'clientes' @()))
        saidas = @(ConvertTo-StringArray (Get-PropertyValue $chainRaw 'saidas' @()))
      }
      riscos = @($risks.ToArray())
    }
    lista_mestra = $listaMestra
    revisoes = @(ConvertTo-ItemArray (Get-PropertyValue $Raw 'revisoes' @([PSCustomObject]@{ numero = '00'; alteracao = 'Emissão inicial do documento para validação do processo.' })))
    pontos_validacao = @($pending)
    transcricao = $normalizedTranscription
  }
}

function Compress-ValidationPoints {
  param([object[]]$Items)

  $result = New-Object System.Collections.Generic.List[string]
  $hasCodes = $false
  $hasRoles = $false
  $hasRisks = $false
  foreach ($item in (ConvertTo-StringArray $Items)) {
    $text = $item.Trim()
    if ($text.Length -eq 0) { continue }

    # Drop granular auto-pendencies in favor of grouped ones.
    if ($text -match '(?i)^Ponto para validação:\s*confirmar código( pop| it| form| mp)?\.?$') { continue }
    if ($text -match '(?i)^Ponto para validação:\s*confirmar (setor|elaborador|verificador|aprovador)\.?$') { continue }
    if ($text -match '(?i)^Ponto para validação:\s*revisar o risco sugerido') { continue }
    if ($text -match '(?i)^Revisar P/G dos riscos sugeridos') { continue }

    if ($text -match '(?i)códigos? oficiais') {
      if ($hasCodes) { continue }
      $hasCodes = $true
    }
    elseif ($text -match '(?i)^Ponto para validação:\s*confirmar .*(setor|elaborador|verificador|aprovador)') {
      if ($hasRoles) { continue }
      $hasRoles = $true
    }
    elseif ($text -match '(?i)revisar P/G dos riscos sugeridos') {
      if ($hasRisks) { continue }
      $hasRisks = $true
    }

    if (-not $result.Contains($text)) { $result.Add($text) }
  }
  return @($result.ToArray())
}

function Build-ListaMestraEntries {
  param(
    $Requested,
    $Document,
    $Files,
    [string[]]$Complementar = @(),
    $RawLista = $null
  )

  $typeMap = [ordered]@{
    pop = [PSCustomObject]@{ Tipo = 'PR'; Codigo = [string]$Document.codigo_pop; Arquivo = [string](Get-PropertyValue $Files 'arquivo_pop' '') }
    it = [PSCustomObject]@{ Tipo = 'IN'; Codigo = [string]$Document.codigo_it; Arquivo = [string](Get-PropertyValue $Files 'arquivo_it' '') }
    form = [PSCustomObject]@{ Tipo = 'FORM'; Codigo = [string]$Document.codigo_form; Arquivo = [string](Get-PropertyValue $Files 'arquivo_form' '') }
    mp = [PSCustomObject]@{ Tipo = 'MP'; Codigo = [string]$Document.codigo_mp; Arquivo = [string](Get-PropertyValue $Files 'arquivo_mp' '') }
  }

  $requestedTypes = @($Requested)
  $packCodes = New-Object System.Collections.Generic.List[string]
  foreach ($type in $requestedTypes) {
    if ($typeMap.Contains($type)) {
      $code = [string]$typeMap[$type].Codigo
      if (-not [string]::IsNullOrWhiteSpace($code)) { $packCodes.Add($code) }
    }
  }

  $raiz = ''
  if ($requestedTypes -contains 'pop') { $raiz = [string]$Document.codigo_pop }

  $citados = New-Object System.Collections.Generic.List[string]
  foreach ($code in $packCodes) {
    if ($code -ne $raiz -and -not $citados.Contains($code)) { $citados.Add($code) }
  }
  foreach ($item in $Complementar) {
    $text = [string]$item
    if ($text -match '(?i)^(PR|IN|FORM|MP)\.[A-Z0-9]+\.[A-Z0-9]+') {
      $codeOnly = ($text -split '\s*-\s*')[0].Trim()
      if ($codeOnly -ne $raiz -and -not $citados.Contains($codeOnly) -and -not $packCodes.Contains($codeOnly)) {
        $citados.Add($codeOnly)
      }
    }
  }

  $byCode = @{}
  $rawEntries = @()
  if ($null -ne $RawLista) {
    $rawEntries = @(ConvertTo-ItemArray (Get-PropertyValue $RawLista 'entradas' @()))
  }
  foreach ($entry in $rawEntries) {
    $codeTitle = [string](Get-PropertyValue $entry 'codigo_titulo' '')
    if ([string]::IsNullOrWhiteSpace($codeTitle)) { continue }
    $codeOnly = ($codeTitle -split '\s*-\s*')[0].Trim()
    $byCode[$codeOnly] = $entry
  }

  $entries = New-Object System.Collections.Generic.List[object]
  $titlePretty = ([string]$Document.titulo).Trim()
  foreach ($type in $requestedTypes) {
    if (-not $typeMap.Contains($type)) { continue }
    $meta = $typeMap[$type]
    $code = [string]$meta.Codigo
    $codigoTitulo = ($code + ' - ' + $titlePretty)
    $existing = $null
    if ($byCode.ContainsKey($code)) { $existing = $byCode[$code] }

    $localizacao = [string](Get-FirstValue @(
      (Get-PropertyValue $existing 'localizacao' $null),
      ('documentos/' + [string]$meta.Arquivo)
    ) '')

    $observacoes = [string](Get-PropertyValue $existing 'observacoes' '')
    if (($code -match '(?i)XXX') -or ([string]$Document.elaborador -match '(?i)#Ponto|Ponto para validação')) {
      if ([string]::IsNullOrWhiteSpace($observacoes)) {
        $observacoes = 'Pendências de código e/ou papéis de aprovação a confirmar.'
      }
    }

    $citadosEntry = @($citados.ToArray())
    if ($null -ne $existing -and $null -ne (Get-PropertyValue $existing 'procedimentos_citados' $null)) {
      $citadosEntry = @(ConvertTo-StringArray (Get-PropertyValue $existing 'procedimentos_citados' @()))
    }

    $entries.Add([PSCustomObject][ordered]@{
      codigo_titulo = [string](Get-FirstValue @((Get-PropertyValue $existing 'codigo_titulo' $null), $codigoTitulo))
      origem = [string](Get-FirstValue @((Get-PropertyValue $existing 'origem' $null), 'INTERNO'))
      tipo = [string](Get-FirstValue @((Get-PropertyValue $existing 'tipo' $null), [string]$meta.Tipo))
      setor = [string](Get-FirstValue @((Get-PropertyValue $existing 'setor' $null), [string]$Document.setor))
      revisao_numero = [string](Get-FirstValue @((Get-PropertyValue $existing 'revisao_numero' $null), [string]$Document.versao, '00'))
      ultima_revisao = [string](Get-FirstValue @((Get-PropertyValue $existing 'ultima_revisao' $null), [string]$Document.revisao, ''))
      elaborador = [string](Get-FirstValue @((Get-PropertyValue $existing 'elaborador' $null), [string]$Document.elaborador))
      verificador = [string](Get-FirstValue @((Get-PropertyValue $existing 'verificador' $null), [string]$Document.verificador))
      aprovador = [string](Get-FirstValue @((Get-PropertyValue $existing 'aprovador' $null), [string]$Document.aprovador))
      data_aprovacao = [string](Get-FirstValue @((Get-PropertyValue $existing 'data_aprovacao' $null), [string]$Document.revisao, ''))
      localizacao = $localizacao
      procedimento_raiz = [string](Get-FirstValue @((Get-PropertyValue $existing 'procedimento_raiz' $null), $raiz))
      procedimentos_citados = $citadosEntry
      observacoes = $observacoes
    })
  }

  return [PSCustomObject]@{ entradas = @($entries.ToArray()) }
}

function Read-NormalizedContent {
  param([Parameter(Mandatory=$true)][string]$ContentJson)

  $path = Get-FullPath $ContentJson
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "JSON não encontrado: $path" }
  $raw = Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json
  if ([string](Get-PropertyValue $raw 'schema_version' '') -eq '2.0' -and
      $null -ne $raw.PSObject.Properties['documentos_solicitados'] -and
      $null -ne $raw.PSObject.Properties['documento']) {
    return ConvertTo-NormalizedContent $raw
  }
  return ConvertTo-NormalizedContent $raw
}
