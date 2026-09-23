$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$toolsDir = Join-Path $scriptDir ".tools"
$jdkDir = Join-Path $toolsDir "jdk-21"
if (Test-Path (Join-Path $jdkDir "bin\java.exe")) {
    $env:JAVA_HOME = $jdkDir
    $env:Path = (Join-Path $jdkDir "bin") + ";" + $env:Path
    Write-Host "[Backend] Using portable JDK 21 at $jdkDir" -ForegroundColor Green
}

$mavenDir = Join-Path $toolsDir "apache-maven-3.9.6"
$mvnCmd = Join-Path $mavenDir "bin\mvn.cmd"

# Check if mvn is globally available
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Write-Host "[Backend] Using system Maven..." -ForegroundColor Green
    mvn spring-boot:run
    exit $LASTEXITCODE
}

if (-not (Test-Path $mvnCmd)) {
    Write-Host "[Backend] Setting up portable Maven 3.9.6..." -ForegroundColor Cyan
    if (-not (Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null }
    $zipPath = Join-Path $toolsDir "maven.zip"
    Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip" -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
    Remove-Item $zipPath -Force
}

Write-Host "[Backend] Launching Spring Boot with Drools on port 8080..." -ForegroundColor Green
& $mvnCmd spring-boot:run
