# Orbis Android 本机调试脚本（Windows）
#
# 用法：
#   1. 另开一个终端启动 Vite 开发服务器：npm run dev
#   2. 连接真机（开启 USB 调试）或启动模拟器
#   3. 运行本脚本：powershell -ExecutionPolicy Bypass -File android-debug.ps1
#
#   ABI 会自动按设备识别：真机 arm64-v8a、模拟器 x86_64。
#   装好后前端改动由 Vite HMR 实时推送到手机，无需重跑本脚本；
#   只有改动 Rust 侧代码时才需要重新执行。
#
# 参数：
#   -Abi <auto|arm64-v8a|x86_64>  手动指定 ABI，默认按设备自动探测
#   -Device <serial>              指定设备（同时连接多台时用 adb devices 查序列号）
#   -NoStrip                      保留调试符号（默认剥离）
#   -Release                      构建 release 包：前端内嵌、无需 Vite，但无热更新
#   -SkipInstall                  只出包，不安装
#
# 只出包、不连设备（拷到其他手机安装）：
#   powershell -ExecutionPolicy Bypass -File android-debug.ps1 -Release -Abi arm64-v8a -SkipInstall
#   同时给出 -Release 与显式 -Abi 时不会调用 adb，全程离线产出已签名 APK。
#
# 说明：
# 本机开发者模式已开启但当前登录会话尚未刷新令牌，cargo-mobile2 的符号链接
# 步骤仍会失败，因此脚本改为「手工编译 .so + 复制进 jniLibs + 跳过 gradle 的
# rust 任务」这条等价路径。重新登录（或重启）后可直接使用官方命令：
#   npm run tauri android dev
#
# 关于体积：debug 的 .so 含大量 DWARF 调试信息（单 ABI 未剥离约 225MB），
# 默认剥离后约 30MB，安装快很多；代价是失去 Rust 侧堆栈符号化，
# 需要排查 native 崩溃时加 -NoStrip。
# 只构建目标 ABI（不再打 universal），避免把另一个架构也塞进包里。

param(
    [ValidateSet('auto', 'arm64-v8a', 'x86_64')]
    [string]$Abi = 'auto',
    [string]$Device = '',
    [switch]$NoStrip,
    [switch]$Release,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$JAVA_HOME    = 'C:\Users\xiongaox\tools\jdk-21.0.12.1+1'
$ANDROID_HOME = 'C:\Users\xiongaox\AppData\Local\Android\Sdk'
$NDK_HOME     = "$ANDROID_HOME\ndk\28.2.13676358"
$LLVM_BIN     = "$NDK_HOME\toolchains\llvm\prebuilt\windows-x86_64\bin"
$PROJ         = 'C:\Users\xiongaox\Downloads\00code\Orbis'
$ANDROID_DIR  = "$PROJ\src-tauri\gen\android"
$ADB          = "$ANDROID_HOME\platform-tools\adb.exe"

$env:JAVA_HOME    = $JAVA_HOME
$env:ANDROID_HOME = $ANDROID_HOME
$env:NDK_HOME     = $NDK_HOME
$env:Path = "$JAVA_HOME\bin;$LLVM_BIN;$ANDROID_HOME\platform-tools;$ANDROID_HOME\cmdline-tools\latest\bin;C:\Users\xiongaox\.cargo\bin;$env:Path"

# adb 参数（多设备时锁定目标）
$script:adbPrefix = @()
if ($Device) { $script:adbPrefix = @('-s', $Device) }

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs)
    & $ADB @($script:adbPrefix + $CommandArgs)
}

# ---------- 1. 确定目标设备与 ABI ----------
# 只出包不安装、且显式指定 ABI 时，全程不接触设备（可直接拷到其他手机安装）
$needsDevice = (-not $SkipInstall) -or ($Abi -eq 'auto')

if ($needsDevice) {
    if (-not $Device) {
        # adb devices 的序列号与状态以制表符分隔；无线调试的序列号可能含空格
        # （如 "adb-xxx (2)._adb-tls-connect._tcp"），不能用 \S+ 或 \s+ 切分
        $devices = @(& $ADB devices | Select-String '^(?<serial>.+)\tdevice$' | ForEach-Object { $_.Matches[0].Groups['serial'].Value })
        if ($devices.Count -eq 0) {
            throw '未检测到设备。请连接手机（开启 USB 调试）或启动模拟器后重试；仅出包可加 -SkipInstall 并显式指定 -Abi。'
        }
        if ($devices.Count -gt 1) {
            Write-Host "检测到多台设备：$($devices -join ', ')" -ForegroundColor Yellow
            Write-Host '请用 -Device <serial> 指定其一。' -ForegroundColor Yellow
            throw '设备不唯一'
        }
        $Device = $devices[0]
    }
}

if ($Abi -eq 'auto') {
    $deviceAbi = (Invoke-Adb shell getprop ro.product.cpu.abi | Out-String).Trim()
    switch -Wildcard ($deviceAbi) {
        'arm64*' { $Abi = 'arm64-v8a' }
        'x86_64' { $Abi = 'x86_64' }
        default  { throw "无法从设备 ABI '$deviceAbi' 推断构建目标，请用 -Abi 手动指定。" }
    }
}

# ABI → 构建参数映射
$build = switch ($Abi) {
    'arm64-v8a' {
        @{ RustTgt = 'aarch64-linux-android'; GradleArch = 'Arm64';  CcVar = 'aarch64_linux_android'; ClangApi = 'aarch64-linux-android24-clang' }
    }
    'x86_64' {
        @{ RustTgt = 'x86_64-linux-android';  GradleArch = 'X86_64'; CcVar = 'x86_64_linux_android';  ClangApi = 'x86_64-linux-android24-clang' }
    }
}

$isEmulator = $Device -like 'emulator-*'
$profile    = if ($Release) { 'release' } else { 'debug' }
$profileCap = if ($Release) { 'Release' } else { 'Debug' }

if ($Device) {
    Write-Host "=== 目标：$Device ($(if ($isEmulator) { '模拟器' } else { '真机' })) / $Abi / $profile ===" -ForegroundColor Cyan
} else {
    Write-Host "=== 目标：仅出包（不安装、不连设备） / $Abi / $profile ===" -ForegroundColor Cyan
}

# ---------- 2. 热更新依赖检查 ----------
if (-not $Release) {
    if (-not $SkipInstall) {
        # adb reverse 把手机的 localhost:9898 转发到宿主机，热更新全靠它
        Invoke-Adb reverse "tcp:9898" "tcp:9898" | Out-Null
        Write-Host '[1/5] adb reverse tcp:9898 已就绪（热更新通道）'
    }
    $viteUp = [bool](Get-NetTCPConnection -LocalPort 9898 -State Listen -ErrorAction SilentlyContinue)
    if (-not $viteUp) {
        Write-Host '  ! 9898 端口无监听：请另开终端运行 npm run dev，否则 App 启动后会白屏报错。' -ForegroundColor Yellow
    } else {
        Write-Host '  Vite 开发服务器已在 9898 运行' -ForegroundColor Green
    }
}

# ---------- 3. 编译 Rust ----------
# cc-rs 找不到不带版本号的 clang，需显式指定目标编译器
Set-Item -Path "Env:CC_$($build.CcVar)"             -Value "$LLVM_BIN\$($build.ClangApi).cmd"
Set-Item -Path "Env:CXX_$($build.CcVar)"            -Value "$LLVM_BIN\$($build.ClangApi)++.cmd"
Set-Item -Path "Env:AR_$($build.CcVar)"             -Value "$LLVM_BIN\llvm-ar.exe"
$linkerVar = "CARGO_TARGET_$($build.RustTgt.ToUpper().Replace('-', '_'))_LINKER"
Set-Item -Path "Env:$linkerVar" -Value "$LLVM_BIN\$($build.ClangApi).cmd"

if ($Release) {
    Write-Host '[2/5] 构建前端（release 需内嵌进二进制）...'
    Set-Location $PROJ
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw '前端构建失败' }
    Write-Host '[3/5] 编译 Rust (release)...'
} else {
    Write-Host '[2/5] 编译 Rust (debug)...'
}

# 前置自检：release 走的是「无 devUrl」路径，而 Tauri 以 `dev = !custom_protocol`
# 判定运行模式，该 feature 一旦缺失或未指向 tauri/custom-protocol，产物就会去请求
# devUrl，装到手机上白屏。这里直接校验声明，把问题挡在构建之前。
# 不用「二进制里搜 devUrl 字符串」判定——该字段作为配置数据本就恒被编入，
# 与运行模式无关，那样判会误拦正常构建。
if ($Release) {
    $manifestText = Get-Content "$PROJ\src-tauri\Cargo.toml" -Raw
    if ($manifestText -notmatch 'custom-protocol\s*=\s*\[[^]]*tauri/custom-protocol') {
        throw "Cargo.toml 未声明 custom-protocol = [`"tauri/custom-protocol`"]，release 产物会是 dev 模式（白屏包）。"
    }
}

Set-Location $PROJ
$cargoArgs = @('build', '--target', $build.RustTgt, '--manifest-path', 'src-tauri/Cargo.toml')
if ($Release) {
    $cargoArgs += '--release'
    # 必须显式开启：Tauri 以 `dev = !custom_protocol` 判定运行模式，
    # 缺了它 release 包仍会去请求 devUrl，装到手机上是白屏。
    # `tauri build` 会自动追加该 feature，手工 cargo 构建不会。
    $cargoArgs += @('--features', 'custom-protocol')
}
& cargo @cargoArgs
if ($LASTEXITCODE -ne 0) { throw 'Rust 编译失败' }
if ($Release) { Write-Host '  custom-protocol 已启用（产物内嵌前端资源，可离线运行）' }

$soPath = "$PROJ\src-tauri\target\$($build.RustTgt)\$profile\libapp_lib.so"
$soMB = [math]::Round((Get-Item $soPath).Length / 1MB, 1)
Write-Host "  编译完成：$soMB MB"

# ---------- 4. 复制 .so 进 jniLibs ----------
Write-Host '[4/5] 准备 jniLibs...'
$jniRoot = "$ANDROID_DIR\app\src\main\jniLibs"
$dstDir  = "$jniRoot\$Abi"
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Copy-Item $soPath "$dstDir\libapp_lib.so" -Force

# 清掉其他架构，确保只打进目标 ABI
Get-ChildItem $jniRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne $Abi } |
    ForEach-Object { Write-Host "  移除无关架构 $($_.Name)"; Remove-Item $_.FullName -Recurse -Force }

if (-not $NoStrip -and -not $Release) {
    # cargo 在 release 下会自动 strip，debug 下不会
    & "$LLVM_BIN\llvm-strip.exe" --strip-unneeded "$dstDir\libapp_lib.so"
    if ($LASTEXITCODE -ne 0) { throw 'strip 失败' }
    $strippedMB = [math]::Round((Get-Item "$dstDir\libapp_lib.so").Length / 1MB, 1)
    Write-Host "  已剥离调试符号：$soMB MB → $strippedMB MB"
}

# 前端资源也需随包提供给 Android 端的 PluginManager
$assetDir = "$ANDROID_DIR\app\src\main\assets"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null
Copy-Item "$PROJ\src-tauri\tauri.conf.json" "$assetDir\tauri.conf.json" -Force

# ---------- 5. Gradle 打包 ----------
Write-Host '[5/5] Gradle 打包（跳过 rust 任务）...'
Set-Location $ANDROID_DIR
& .\gradlew.bat "assemble$($build.GradleArch)$profileCap" `
    -x rustBuildUniversalDebug  -x rustBuildUniversalRelease `
    -x rustBuildArm64Debug      -x rustBuildArm64Release `
    -x rustBuildArmDebug        -x rustBuildArmRelease `
    -x rustBuildX86Debug        -x rustBuildX86Release `
    -x rustBuildX86_64Debug     -x rustBuildX86_64Release
if ($LASTEXITCODE -ne 0) { throw 'Gradle 打包失败' }

$apk = "$ANDROID_DIR\app\build\outputs\apk\$($build.GradleArch.ToLower())\$profile\app-$($build.GradleArch.ToLower())-$profile-unsigned.apk"
if (-not (Test-Path $apk)) {
    $apk = (Get-ChildItem "$ANDROID_DIR\app\build\outputs\apk" -Recurse -Filter "*$profile*.apk" |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

# ---------- 6. 签名 ----------
# release 产物默认未签名（AGP 不自动签），未签名 APK 无法安装到手机。
# 用本机 debug keystore 签名：适合自用侧载，且与 debug 包共用同一证书，
# 后续重新构建可直接覆盖安装，不会因签名不一致被系统拒绝。
if ($Release) {
    Write-Host '[6/7] 签名 release 包...'
    $buildTools   = "$ANDROID_HOME\build-tools\35.0.0"
    $keystore     = "$env:USERPROFILE\.android\debug.keystore"
    $alignedApk   = "$ANDROID_DIR\app\build\outputs\apk\orbis-$Abi-release-aligned.apk"
    $signedApk    = "$ANDROID_DIR\app\build\outputs\apk\orbis-$Abi-release.apk"

    if (-not (Test-Path $keystore)) { throw "未找到签名密钥库：$keystore" }

    & "$buildTools\zipalign.exe" -p -f 4 $apk $alignedApk
    if ($LASTEXITCODE -ne 0) { throw 'zipalign 失败' }

    & "$buildTools\apksigner.bat" sign `
        --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey `
        --out $signedApk $alignedApk
    if ($LASTEXITCODE -ne 0) { throw 'APK 签名失败' }

    Remove-Item $alignedApk -Force

    # 验证签名，避免产出装不上的包。
    # 注意不能把原生命令接到 Select-Object -First 这类会提前掐断管道的命令上：
    # 进程被提前终止会让 $LASTEXITCODE 变成非零，导致误报失败。
    $verifyOutput = & "$buildTools\apksigner.bat" verify --print-certs $signedApk 2>&1
    if ($LASTEXITCODE -ne 0) { throw "APK 签名校验失败：$verifyOutput" }
    $verifyOutput | Select-Object -First 3

    $apk = $signedApk
}

$apkMB = [math]::Round((Get-Item $apk).Length / 1MB, 1)
Write-Host "  APK: $apk  ($apkMB MB)" -ForegroundColor Green

if ($SkipInstall) { Write-Host '已跳过安装（产物可直接拷到其他手机安装）'; exit 0 }

# ---------- 7. 安装并启动 ----------
# debug 包名带 .debug 后缀（applicationIdSuffix），release 不带，必须按 profile 区分
$appId = if ($Release) { 'com.orbis.app' } else { 'com.orbis.app.debug' }

Write-Host '=== 安装并启动 ==='
Invoke-Adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw '安装失败' }
Invoke-Adb shell am force-stop $appId
Invoke-Adb shell am start -n "$appId/com.orbis.app.MainActivity" | Out-Null

Write-Host ''
if ($Release) {
    Write-Host '完成。release 包前端已内嵌，不依赖 Vite。' -ForegroundColor Green
} else {
    Write-Host '完成。前端改动会由 Vite 热更新自动生效，无需重跑本脚本。' -ForegroundColor Green
    Write-Host '查看日志： adb logcat -s RustWebView:D'
}
