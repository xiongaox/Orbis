import { defineConfig } from 'vitest/config';

// Worker 独立测试配置：仅匹配本目录测试，与主仓前端 vitest 互不扫扰
// （主仓根 package.json 的 test 脚本已 exclude 本目录）。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
