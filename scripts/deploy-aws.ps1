$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Read-DotEnv($path) {
  $map = @{}
  if (Test-Path $path) {
    Get-Content $path | ForEach-Object {
      if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
      $parts = $_.Split("=", 2)
      $map[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $map
}

$envMap = Read-DotEnv (Join-Path $Root ".env")
$mongoUri = $env:MONGODB_URI
if (-not $mongoUri) { $mongoUri = $envMap["MONGODB_URI"] }
if (-not $mongoUri) { throw "MONGODB_URI is missing. Put your Atlas URL in .env." }
if ($mongoUri -notmatch "mongodb\+srv://") {
  throw "Use your Atlas mongodb+srv:// URL in .env before deploying."
}

$Region = $env:AWS_REGION
if (-not $Region) { $Region = $env:AWS_DEFAULT_REGION }
if (-not $Region) { $Region = "us-east-1" }

$Account = (aws sts get-caller-identity --query Account --output text)
if (-not $Account) { throw "AWS CLI is not signed in. Run aws configure first." }

$Repo = "study-tracker"
$Service = "study-tracker"
$Image = "$Account.dkr.ecr.$Region.amazonaws.com/${Repo}:latest"

Write-Host "Using AWS account $Account in $Region"

aws ecr describe-repositories --repository-names $Repo --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
  aws ecr create-repository --repository-name $Repo --region $Region | Out-Null
}

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$Account.dkr.ecr.$Region.amazonaws.com"
docker build -t $Repo $Root
docker tag "${Repo}:latest" $Image
docker push $Image

$Existing = aws apprunner list-services --region $Region --query "ServiceSummaryList[?ServiceName=='$Service'].ServiceArn" --output text
$AccessRole = "arn:aws:iam::${Account}:role/service-role/AppRunnerECRAccessRole"
$RuntimeRole = "arn:aws:iam::${Account}:role/AppRunnerStudyTrackerRole"

$Source = @{
  ImageRepository = @{
    ImageIdentifier = $Image
    ImageRepositoryType = "ECR"
    ImageConfiguration = @{
      Port = "4000"
      RuntimeEnvironmentVariables = @{
        NODE_ENV = "production"
        PORT = "4000"
        MONGODB_URI = $mongoUri
      }
    }
  }
  AutoDeploymentsEnabled = $true
  AuthenticationConfiguration = @{
    AccessRoleArn = $AccessRole
  }
} | ConvertTo-Json -Depth 8 -Compress

if ($Existing) {
  aws apprunner update-service --region $Region --service-arn $Existing --source-configuration $Source
} else {
  aws apprunner create-service --region $Region --service-name $Service --source-configuration $Source --instance-configuration Cpu=1024,Memory=2048
}

Write-Host "App Runner deploy started. Check the AWS App Runner console for the HTTPS URL."
