<#
.SYNOPSIS
    Configura a política corporativa do Google Chrome (AutoSelectCertificateForUrls)
    para selecionar automaticamente o certificado digital da Exatas Contabilidade
    sem exibir popups ou janelas modais de seleção.

.NOTES
    Requisito: Executar este script no PowerShell como Administrador.
#>

# Configura tanto em HKLM (se tiver permissão de Admin) quanto em HKCU (usuário atual)
$targets = @(
    "HKCU:\Software\Policies\Google\Chrome\AutoSelectCertificateForUrls",
    "HKLM:\Software\Policies\Google\Chrome\AutoSelectCertificateForUrls"
)

# Regras oficiais de auto-seleção pelo Subject Common Name (CN) da Exatas Contabilidade
$cnpjExatas = "EXATAS CONTABILIDADE LTDA:27939154000108"

$regras = @(
    '{"pattern":"https://certificado.sso.acesso.gov.br","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://certificado.sso.acesso.gov.br:443","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]acesso.gov.br","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]acesso.gov.br:443","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]dataprev.gov.br","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]dataprev.gov.br:443","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]trabalho.gov.br","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://[*.]trabalho.gov.br:443","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://spe.sistema.gov.br","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}',
    '{"pattern":"https://spe.sistema.gov.br:443","filter":{"SUBJECT":{"CN":"' + $cnpjExatas + '"}}}'
)

foreach ($path in $targets) {
    try {
        if (!(Test-Path $path)) {
            New-Item -Path $path -Force | Out-Null
        }
        Remove-ItemProperty -Path $path -Name * -ErrorAction SilentlyContinue
        $index = 1
        foreach ($regra in $regras) {
            Set-ItemProperty -Path $path -Name "$index" -Value $regra -ErrorAction Stop
            $index++
        }
        Write-Host "Configurado com sucesso em: $path" -ForegroundColor Green
    } catch {
        Write-Host "Aviso: Nao foi possivel gravar em $path ($($_.Exception.Message))." -ForegroundColor Yellow
    }
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Politica AutoSelectCertificateForUrls atualizada!" -ForegroundColor Green
Write-Host "Certificado selecionado automaticamente: $cnpjExatas" -ForegroundColor Cyan
Write-Host "Portais cobertos: Gov.br, Dataprev (FAP), DET e SPE." -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Green

