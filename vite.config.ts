import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 非前端目录，统一排除出 chokidar 监视范围。
//
// chokidar 会把整个项目根纳入监视，其中 cargo 的 .so / .exe、gradle 的 APK、
// 案例加密包等都是「独占写入」的二进制。Windows 下监视这类文件会抛
// EBUSY: resource busy or locked，而该异常是 error 事件而非警告，
// 会直接终止 Vite 进程（曾两次踩到：target/ 下的 build_script_build.exe
// 与 gen/android/.../jniLibs/ 下的 libapp_lib.so）。
//
// 这些目录都不在前端依赖图内（src/ 下无任何引用），整目录排除后
// 新增构建产物路径也不会再触发同类崩溃。
//
// 另一类坑：编辑器/AI 工具对 src/ 内文件做「临时文件 + 原子替换」写入时，
// 会短暂出现 *.tmpdir/*.tmp 中间产物，fs.watch 同样可能 EBUSY 崩掉 Vite
//（2026-09-22 踩到：.WangShuaiAiPanel.tsx.*.tmpdir 下的 .tmp）。watch 还
// 接不住：chokidar 默认 useFsWatchEvents，注入的 error 处理器不覆盖它。
// 故按后缀/目录名把这类中间产物一并排除，只排除仍会漏。
const nonFrontendDirs = [
  '**/src-tauri/**',   // Rust 源码、target、gen/android、各类打包产物
  '**/dist-cases/**',  // cases:pack 生成的加密案例包
  '**/keys/**',        // 作者端密钥材料
  '**/*.tmp',          // 原子写入的中间产物（编辑器保存、AI 工具改文件）
  '**/*.tmpdir/**',    // 同上：原子写入使用的临时目录
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 9898,
    watch: {
      ignored: nonFrontendDirs,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
