
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadAppSettings } from './services/appSettingStore'
import { preloadAiChatSessions } from './services/aiChatHistoryService'
import { preloadAiResearchStatuses } from './services/aiTaskStatusService'
import { preloadAutoBackupState } from './services/remoteBackupService'
import { preloadTheme } from './services/themeService'
import { migrateQimenTitlesIntoDescription, migrateQimenTimezoneShift } from './services/qimenCaseService'
import { seedDemoCases } from './lib/demoCases'

// 启动预热：把 SQLite 里的设置/对话历史/研判状态/备份时间戳载入内存缓存。
// 必须在首屏渲染前完成，否则各处的同步读（readSetting/getAllSessions 等）只会拿到空默认值。
// preloadAppSettings 先行，其余同步预热（研判状态、主题）依赖它的缓存。
async function bootstrap() {
  await preloadAppSettings()
  // 主题对齐要在 React 挂载前生效，避免首屏底色与持久化值不一致
  preloadTheme()
  preloadAiResearchStatuses()
  await Promise.all([
    preloadAiChatSessions(),
    preloadAutoBackupState(),
    // 存量奇门案例：标题补进正文首句（一次性，幂等）
    migrateQimenTitlesIntoDescription(),
    // 存量奇门案例：CSV 迁移批次的时间回正（一次性，幂等）
    migrateQimenTimezoneShift(),
    // 首次启动投放两条示例案例（一次性，幂等；删掉后不会复活）
    seedDemoCases(),
  ])
}

bootstrap().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
