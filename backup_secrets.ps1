# === CONFIGURACIÓN ===
# Ruta de origen de los ficheros dentro de WSL
$SourceDir = "\\wsl.localhost\Ubuntu-20.04\home\pirate\docker\free.deft.work\client"

# Ruta de destino en tu unidad de Google Drive
$DestDir = "G:\Mi unidad\Apps\free.deft.work"

# Ficheros a copiar
$FilesToCopy = @(
    ".env",
    "firebase-service-account.json"
)

# === SCRIPT ===

Write-Host "Iniciando copia de seguridad de ficheros sensibles..."

# Comprobar si el directorio de destino existe
if (-not (Test-Path -Path $DestDir -PathType Container)) {
    Write-Host "Error: El directorio de destino no existe en la ruta especificada: $DestDir"
    Write-Host "Por favor, asegúrate de que la ruta es correcta y la unidad está disponible."
    exit 1
}

foreach ($File in $FilesToCopy) {
    $SourceFile = Join-Path -Path $SourceDir -ChildPath $File
    $DestFile = Join-Path -Path $DestDir -ChildPath $File

    if (Test-Path -Path $SourceFile) {
        Write-Host "Copiando $File a $DestDir"
        Copy-Item -Path $SourceFile -Destination $DestFile -Force
    } else {
        Write-Host "Advertencia: No se encontró el fichero de origen: $SourceFile"
    }
}

Write-Host "¡Copia de seguridad completada!"

