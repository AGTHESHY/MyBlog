param(
    [string]$ContainerName = "mysql",
    [string]$User = "root",
    [string]$Password = "root",
    [ValidateSet("init", "reset", "reset-init")]
    [string]$Action = "init"
)

$ErrorActionPreference = "Stop"
$Migrations = $PSScriptRoot

function Invoke-SqlFile {
    param([string]$FileName)
    $localPath = Join-Path $Migrations $FileName
    if (-not (Test-Path $localPath)) {
        throw "SQL file not found: $localPath"
    }
    $remotePath = "/tmp/$FileName"
    docker cp $localPath "${ContainerName}:$remotePath"
    docker exec $ContainerName sh -c "mysql -u$User -p$Password --default-character-set=utf8mb4 < $remotePath"
}

switch ($Action) {
    "reset" { Invoke-SqlFile "reset_mysql.sql" }
    "init" { Invoke-SqlFile "init_mysql.sql" }
    "reset-init" {
        Invoke-SqlFile "reset_mysql.sql"
        Invoke-SqlFile "init_mysql.sql"
    }
}

$verifySql = "SELECT HEX(COLUMN_COMMENT) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='xhblogs' AND TABLE_NAME='posts' AND COLUMN_NAME='title';"
docker exec $ContainerName mysql -u$User -p$Password -N -e $verifySql
