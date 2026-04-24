# Abre o dialogo Abrir arquivo do Windows. Escreve o caminho em UTF-8 em um arquivo temp
# e imprime o caminho do temp no stdout (evita problema de encoding no pipe).
# Se o usuario cancelar, sai com codigo 1.
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = "Planilhas Excel (*.xlsx;*.xls)|*.xlsx;*.xls|Todos os arquivos (*.*)|*.*"
$dialog.Title = "Selecionar planilha Excel"
$dialog.InitialDirectory = [Environment]::GetFolderPath("MyDocuments")
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempFile, $dialog.FileName, [System.Text.Encoding]::UTF8)
    Write-Output $tempFile
} else {
    exit 1
}
