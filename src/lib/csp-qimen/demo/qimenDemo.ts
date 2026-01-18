export interface CustomTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

// Global state for the demo
let currentPaiPanMethod: 'zhirun' | 'yinpan' | 'chaibu' | 'maoshan' = 'zhirun';
let currentTime: CustomTime | undefined = undefined;
// WASM State
let cspRawOutput: string = '';
let wasmModule: any = null;
let isWasmLoading: boolean = false;

/**
 * 初始化 CSP WASM 模块
 */
async function initCspWasm() {
  if (wasmModule || isWasmLoading) return;
  isWasmLoading = true;
  console.log("Initializing CSP WASM...");

  try {
    const script = document.createElement('script');
    script.src = '/wasm/csp_qimen.js';
    script.async = true;

    const loadPromise = new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    document.body.appendChild(script);
    await loadPromise;

    if ((window as any).createCspModule) {
      wasmModule = await (window as any).createCspModule({
        locateFile: (path: string) => `/wasm/${path}`
      });
      console.log("🔥 CSP WASM Loaded Successfully!");
    }
  } catch (e) {
    console.error("Failed to load CSP WASM:", e);
  } finally {
    isWasmLoading = false;
    render(); // Re-render to update UI status
  }
}

/**
 * 调用 CSP WASM 进行排盘 (同步)
 */
// Call CSP WASM
function callCspWasm(time: CustomTime, type: number): string {
  if (!wasmModule) return "WASM 模块加载中，请稍候...";

  try {
    const param = new wasmModule.CmdParam();
    param.year = time.year;
    // WASM expects 1-12 for manual mode (tyme library convention)
    param.mon = time.month;
    param.day = time.day;
    param.hour = time.hour;
    param.min = time.minute;

    // Initialize fields
    param.sec = 0;
    // Set zone to 0.0 because the input time (str_dt/hour/min) is already Local Time (Beijing Time).
    // If we set zone=8.0, the WASM engine treats input as UTC and adds 8 hours, causing incorrect ShiChen (e.g., 1:22 -> 9:22).
    param.zone = 0.0;
    const pad = (n: number) => n.toString().padStart(2, '0');
    param.str_dt = `${time.year}-${pad(time.month)}-${pad(time.day)} ${pad(time.hour)}:${pad(time.minute)}:00`;

    // Manual Mode
    param.is_auto = false;

    // Native Calculation: By passing ju=0, we trigger WASM's internal cal_ju() logic
    param.ju = 0;
    param.type = type; // 1=ZhiRun, 2=YinPan, 3=ChaiBu, 4=MaoShan

    console.log('[DemoDebug] Native WASM Call:', {
      type: param.type,
      ju: param.ju,
      is_auto: param.is_auto,
      date: param.str_dt
    });

    const qm = new wasmModule.CQimenUse();
    let output = "";
    try {
      output = qm.run_captured(param);
    } catch (innerE: any) {
      console.error("qm.run_captured threw:", innerE);
      let msg = innerE;
      if (wasmModule.getExceptionMessage) {
        try {
          msg = wasmModule.getExceptionMessage(innerE);
        } catch (ignored) { }
      }
      throw msg;
    }

    if (param.delete) param.delete();
    if (qm.delete) qm.delete();

    return output;
  } catch (e: any) {
    console.error("WASM Execution Error:", e);
    const errMsg = typeof e === 'string' ? e : (e.message || JSON.stringify(e));
    return `WASM Error: ${errMsg}`;
  }
}

/**
 * 调用 CSP Engine (优先 WASM，降级 API)
 */
async function callCspEngine(time: CustomTime, type: number = 1): Promise<string> {
  if (wasmModule) {
    return callCspWasm(time, type);
  }

  if (isWasmLoading) {
    return "WASM 正在加载中...";
  }

  return "WASM 未加载。请刷新页面重试。";
}

export function renderQimenDemo() {
  const root = document.getElementById('qimen-demo-root');
  if (!root) return;

  // Initialize currentTime if not set
  if (!currentTime) {
    const now = new Date();
    currentTime = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }

  // Initialize WASM
  initCspWasm();

  render();
}

// Function render() is defined at the bottom of the file now
// to allow using it in initCspWasm's finally block properly.
// (It was moved to avoid circular scoping issues during refactor)

/**
 * 解析 CSP 输出为结构化数据
 */
interface CspPalace {
  shen: string;    // 八神
  xing: string;    // 九星
  men: string;     // 八门
  tianPan: string; // 天盘干 (主)
  tianPanJi: string; // 天盘干 (寄)
  diPan: string;   // 地盘干 (主)
  diPanJi: string; // 地盘干 (寄)
  isKong: boolean; // 是否空亡
  isMa: boolean;   // 是否驿马
}

interface CspParsedData {
  ju: string;           // 局数
  jieQi: string;        // 节气
  sanYuan: string;      // 三元
  zhiFu: string;        // 值符
  zhiShi: string;       // 值使
  siZhu: string;        // 四柱
  kongWang: string;     // 空亡
  palaces: CspPalace[]; // 9个宫位（按洛书顺序：4,9,2,3,5,7,8,1,6）
}

function parseCspOutput(output: string): CspParsedData | null {
  if (!output || output.length < 50) return null;

  // 先移除 ANSI 颜色码
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

  const lines = cleanOutput.split('\n');
  const result: CspParsedData = {
    ju: '', jieQi: '', sanYuan: '', zhiFu: '', zhiShi: '',
    siZhu: '', kongWang: '',
    palaces: []
  };

  // 解析值符、值使、节气、局数
  for (const line of lines) {
    // 值符：天任  值使：生门    [小寒下元][阳遁五局]
    if (line.includes('值符：') && line.includes('值使：')) {
      const match = line.match(/值符：(\S+)\s+值使：(\S+)\s+\[(\S+)\]\[(\S+)\]/);
      if (match) {
        result.zhiFu = match[1];
        result.zhiShi = match[2];
        result.jieQi = match[3].replace('上元', '').replace('中元', '').replace('下元', '');
        result.sanYuan = match[3].includes('上元') ? '上' : match[3].includes('中元') ? '中' : '下';
        result.ju = match[4];
      }
    }
    // 干支行
    if (line.includes('干支：')) {
      const match = line.match(/干支：(.+)/);
      if (match) {
        result.siZhu = match[1].replace(/\s+/g, ' ').trim();
      }
    }
    // 旬空行
    if (line.includes('旬空：')) {
      const match = line.match(/旬空：(.+)/);
      if (match) {
        result.kongWang = match[1].trim();
      }
    }
  }

  // 解析九宫格（CSP 输出格式：3行一组，每组3个宫）
  // 洛书顺序：巽(4)离(9)坤(2) / 震(3)中(5)兑(7) / 艮(8)坎(1)乾(6)
  // CSP 输出的宫位顺序也是这样
  const palaceData: CspPalace[] = Array(9).fill(null).map(() => ({
    shen: '', xing: '', men: '',
    tianPan: '', tianPanJi: '',
    diPan: '', diPanJi: '',
    isKong: false, isMa: false
  }));

  // 找到九宫格开始的位置
  // 策略：寻找第一个以 | 开头的行，且后续连续几行也包含 |
  let gridStartIdx = -1;
  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && lines[i + 1].includes('|') && lines[i + 2].includes('|')) {
      // 确认这行是不是表头的分隔符? 通常分隔符是 == 或 --，而内容行有 |
      // 但是为了保险，我们再检查一下内容特征：是否包含中文字符
      if (/[\u4e00-\u9fa5]/.test(line)) {
        gridStartIdx = i;
        break;
      }
    }
  }

  if (gridStartIdx === -1) {
    // 无法解析九宫格
    return result;
  }

  // 解析三行（每行3个宫）
  // 第一行：宫4,9,2
  // 第二行：宫3,5,7
  // 第三行：宫8,1,6
  const rowMappings = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

  // 每组占3行（八神行、九星行、八门行），中间有分隔线
  for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
    const positions = rowMappings[rowIdx];
    // 找到这一组的起始位置
    const startLine = gridStartIdx + rowIdx * 4; // 每组4行（3内容行+1分隔线）

    // 跳过中宫的特殊处理
    if (startLine + 2 >= lines.length) break;

    // 八神行
    const shenLine = lines[startLine] || '';
    // 九星行
    const xingLine = lines[startLine + 1] || '';
    // 八门行
    const menLine = lines[startLine + 2] || '';

    // 按 | 分割，取每个单元格（注意：不要 filter，保留空字符串以维持索引）
    // split('|') 结果通常是 ["", "内容1", "内容2", "内容3", ""]
    // 我们需要的是中间的 3 个元素
    const shenCells = shenLine.split('|');
    const xingCells = xingLine.split('|');
    const menCells = menLine.split('|');

    // 移除收尾的空串（通常 split 会产生首尾空串如果字符串以分隔符开始/结束）
    if (shenCells[0].trim() === '') shenCells.shift();
    if (xingCells[0].trim() === '') xingCells.shift();
    if (menCells[0].trim() === '') menCells.shift();

    for (let colIdx = 0; colIdx < 3; colIdx++) {
      const pos = positions[colIdx];
      const idx = pos === 5 ? 4 : (pos < 5 ? pos - 1 : pos - 2); // 转换为数组索引

      const shenCell = shenCells[colIdx] || '';
      const xingCell = xingCells[colIdx] || '';
      const menCell = menCells[colIdx] || '';

      // 解析八神（如 "太阴  (空)" -> 八神="太阴", isKong=true）
      const shenMatch = shenCell.match(/^\s*(\S+)\s*(?:\(([空马])\))?/);
      if (shenMatch) {
        palaceData[idx].shen = shenMatch[1];
        if (shenMatch[2] === '空') palaceData[idx].isKong = true;
        if (shenMatch[2] === '马') palaceData[idx].isMa = true;
      }

      // 解析九星和天盘干（如 "天辅   乙" -> 九星="天辅", 天盘干="乙"）
      const xingMatch = xingCell.match(/^\s*(\S+)\s+(\S+)/);
      if (xingMatch) {
        palaceData[idx].xing = xingMatch[1];
        palaceData[idx].tianPan = xingMatch[2];
      }

      // 解析八门和地盘干（如 "死门   乙" -> 八门="死门", 地盘干="乙"）
      const menMatch = menCell.match(/^\s*(\S+)\s+(\S+)/);
      if (menMatch) {
        palaceData[idx].men = menMatch[1].replace('门', '');
        palaceData[idx].diPan = menMatch[2];
      }
    }
  }

  result.palaces = palaceData;
  return result;
}

/**
 * 生成 CSP 输出的 HTML（九宫格样式，与 Orbis 引擎一致）
 */
function generateCspHTML(output: string, customTime: CustomTime | undefined): string {
  const now = customTime || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  };

  // 尝试解析 CSP 输出
  const parsed = parseCspOutput(output);

  const methodNames: Record<string, string> = {
    zhirun: '置闰法',
    yinpan: '阴盘',
    chaibu: '拆补法',
    maoshan: '茅山法'
  };
  const methodDisplay = methodNames[currentPaiPanMethod] || '置闰法';

  // 如果解析成功且有宫位数据，使用九宫格渲染
  if (parsed && parsed.palaces.length === 9 && parsed.ju) {
    // 洛书九宫顺序：4,9,2,3,5,7,8,1,6
    const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
    // const GONG_NAMES = ['', '坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];

    // 暗干占位（CSP 不输出暗干，暂留空或显示占位符）
    const getAnGan = (_: number) => '';

    const palacesHTML = LUOSHU_ORDER.map((pos) => {
      const idx = pos === 5 ? 4 : (pos < 5 ? pos - 1 : pos - 2);
      const palace = parsed.palaces[idx];
      const isCenter = pos === 5;

      if (isCenter) {
        return `
          <div class="demo-palace demo-center">
            <div class="demo-tianpan" style="font-size:28px;text-align:center;width:100%">戊</div>
          </div>
        `;
      }

      /* 
         Layout 3x3:
         Row 1: Angan | Shen | Kong/Ma
         Row 2: JiTian | Xing | Tian
         Row 3: JiDi | Men | Di
      */
      return `
        <div class="demo-palace">
          <!-- Row 1 -->
          <div class="palace-grid-item item-angan">${getAnGan(pos)}</div>
          <div class="palace-grid-item item-shen">${palace.shen || ''}</div>
          <div class="palace-grid-item item-status">
            ${palace.isKong ? '<span class="status-kong">空</span>' : ''}
            ${palace.isMa ? '<span class="status-ma">马</span>' : ''}
          </div>
          
          <!-- Row 2 -->
          <div class="palace-grid-item item-jitian">${palace.tianPanJi || ''}</div>
          <div class="palace-grid-item item-xing">${palace.xing?.replace('天', '') || ''}</div>
          <div class="palace-grid-item item-tianpan">${palace.tianPan || ''}</div>
          
          <!-- Row 3 -->
          <div class="palace-grid-item item-jidi">${palace.diPanJi || ''}</div>
          <div class="palace-grid-item item-men">${palace.men || ''}</div>
          <div class="palace-grid-item item-dipan">${palace.diPan || ''}</div>
        </div>
      `;
    }).join('');

    return `
      <style>
        .demo-container { font-family: 'Songti SC', serif; background: #1a1a2e; color: #e8e8e8; padding: 24px; border-radius: 12px; }
        .demo-header { margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; }
        .demo-title { font-size: 18px; color: #e67e22; margin-bottom: 8px; }
        .demo-date { font-size: 16px; color: #e67e22; margin-bottom: 12px; }
        .demo-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 14px; color: #aaa; }
        .demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; }
        
        /* 3x3 Palace Grid */
        .demo-palace { 
            position: relative; 
            background: rgba(26,26,46,0.95); 
            min-height: 120px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            padding: 8px;
        }
        
        .demo-center { 
            background: rgba(40,40,60,0.95); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }

        .palace-grid-item {
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        /* Specific Item Styling */
        .item-angan { color: #555; font-size: 12px; } /* 暗干 - 灰色 */
        .item-shen { color: #e74c3c; font-size: 14px; } /* 八神 - 红色 */
        
        .item-status { font-size: 10px; display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
        .status-kong { color: #e74c3c; border: 1px solid #e74c3c; padding: 0 2px; border-radius: 2px; }
        .status-ma { color: #f1c40f; border: 1px solid #f1c40f; padding: 0 2px; border-radius: 2px; }

        .item-jitian { color: #e67e22; font-size: 14px; opacity: 0.8; } /* 寄宫天盘 - 橙色 */
        .item-xing { color: #e74c3c; font-size: 14px; } /* 九星 - 红色 */
        .item-tianpan { color: #e67e22; font-size: 24px; } /* 天盘 - 大橙色 */
        
        .item-jidi { color: #3498db; font-size: 14px; opacity: 0.8; } /* 寄宫地盘 - 蓝色 */
        .item-men { color: #f1c40f; font-size: 16px; } /* 八门 - 黄色 */
        .item-dipan { color: #3498db; font-size: 16px; } /* 地盘 - 蓝色 */

        .demo-tianpan { color: #e67e22; font-size: 28px; font-weight: bold; }
        
        .demo-btn { background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 10px; margin-top: 16px; }
        .demo-btn:hover { opacity: 0.9; }
        .demo-btn-group { display: flex; gap: 10px; margin-bottom: 16px; }
        .demo-toggle-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s; }
        .demo-toggle-btn:hover { background: rgba(255,255,255,0.2); }
        .demo-toggle-btn.active { background: #e67e22; color: #fff; border-color: #e67e22; }
        .demo-select { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 4px; }
        .demo-input-group { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; align-items: center; }
        .demo-input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 10px; border-radius: 4px; width: 70px; font-size: 14px; }
        .demo-input:focus { outline: none; border-color: #e67e22; }
        .demo-label { color: #888; font-size: 13px; }
        .demo-marker { position: absolute; font-size: 12px; font-weight: bold; padding: 1px 3px; pointer-events: none; border-radius: 3px; line-height: 1; z-index: 10; }
        .demo-kong-text { top: 2px; right: 2px; color: #e74c3c; border: 1px solid #e74c3c; opacity: 0.8; }
        .demo-ma-text { bottom: 2px; right: 20px; color: #f1c40f; border: 1px solid #f1c40f; opacity: 0.8; }
        .csp-badge { background: #e67e22; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 8px; }
      </style>
      <div class="demo-container">
        <div class="demo-header">
          <div class="demo-title">时家奇门 | CSP 引擎 <span class="csp-badge">{{METHOD_NAME}}</span></div>
          <div class="demo-date">\${now.year}年\${now.month}月\${now.day}日 \${now.hour}时\${now.minute}分</div>

          <div class="demo-info">
            <div>\${parsed.siZhu}</div>
            <div>\${parsed.ju}</div>
            <div>节气：\${parsed.jieQi}\${parsed.sanYuan}元</div>
            <div>值符：\${parsed.zhiFu}</div>
            <div>值使：\${parsed.zhiShi}</div>
            <div>空亡：\${parsed.kongWang}</div>
          </div>
        </div>
        <div class="demo-grid">
          \${palacesHTML}
        </div>
        <div class="demo-input-group">
          <select id="select-method" class="demo-select" style="margin-right:8px">
            <option value="zhirun" ${currentPaiPanMethod === 'zhirun' ? 'selected' : ''}>置闰法 (Type 1)</option>
            <option value="yinpan" ${currentPaiPanMethod === 'yinpan' ? 'selected' : ''}>阴盘 (Type 2)</option>
            <option value="chaibu" ${currentPaiPanMethod === 'chaibu' ? 'selected' : ''}>拆补法 (Type 3)</option>
            <option value="maoshan" ${currentPaiPanMethod === 'maoshan' ? 'selected' : ''}>茅山法 (Type 4)</option>
          </select>
          <input type="number" id="input-year" class="demo-input" value="\${now.year}" placeholder="年" min="1900" max="2100">
          <span class="demo-label">年</span>
          <input type="number" id="input-month" class="demo-input" value="\${now.month}" placeholder="月" min="1" max="12">
          <span class="demo-label">月</span>
          <input type="number" id="input-day" class="demo-input" value="\${now.day}" placeholder="日" min="1" max="31">
          <span class="demo-label">日</span>
          <input type="number" id="input-hour" class="demo-input" value="\${now.hour}" placeholder="时" min="0" max="23">
          <span class="demo-label">时</span>
          <input type="number" id="input-minute" class="demo-input" value="\${now.minute}" placeholder="分" min="0" max="59">
          <span class="demo-label">分</span>
          <button id="btn-custom" class="demo-btn">自定义起盘</button>
          <button id="btn-prev-hour" class="demo-btn" style="background: #e74c3c;">上一局</button>
          <button id="btn-next-hour" class="demo-btn" style="background: #27ae60;">下一局</button>
        </div>
      </div>
    `.replace(/\$\{now\.year\}/g, String(now.year))
      .replace(/\$\{now\.month\}/g, String(now.month))
      .replace(/\$\{now\.day\}/g, String(now.day))
      .replace(/\$\{now\.hour\}/g, String(now.hour))
      .replace(/\$\{now\.minute\}/g, String(now.minute))
      .replace(/\$\{parsed\.siZhu\}/g, parsed.siZhu)
      .replace(/\$\{parsed\.ju\}/g, parsed.ju)
      .replace(/\$\{parsed\.jieQi\}/g, parsed.jieQi)
      .replace(/\$\{parsed\.sanYuan\}/g, parsed.sanYuan)
      .replace(/\$\{parsed\.zhiFu\}/g, parsed.zhiFu)
      .replace(/\$\{parsed\.zhiShi\}/g, parsed.zhiShi)
      .replace(/\$\{parsed\.kongWang\}/g, parsed.kongWang)
      .replace(/\$\{palacesHTML\}/g, palacesHTML)
      .replace(/\$\{currentPaiPanMethod === 'zhirun' \? 'selected' : ''\}/g, currentPaiPanMethod === 'zhirun' ? 'selected' : '')
      .replace(/\$\{currentPaiPanMethod === 'chaibu' \? 'selected' : ''\}/g, currentPaiPanMethod === 'chaibu' ? 'selected' : '')
      .replace(/{{METHOD_NAME}}/g, methodDisplay);
  }

  // 如果解析失败，显示原始文本
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

  return `
    <style>
      .csp-container { font-family: 'Menlo', 'Monaco', monospace; background: #1a1a2e; color: #e8e8e8; padding: 24px; border-radius: 12px; }
      .csp-header { margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; }
      .csp-title { font-size: 18px; color: #e67e22; margin-bottom: 8px; }
      .csp-date { font-size: 14px; color: #4ecdc4; margin-bottom: 12px; }
      .csp-btn-group { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
      .csp-toggle-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s; }
      .csp-toggle-btn:hover { background: rgba(255,255,255,0.2); }
      .csp-toggle-btn.active { background: #e67e22; color: #fff; border-color: #e67e22; }
      .csp-output { background: #0d0d1a; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; overflow-x: auto; max-height: 500px; overflow-y: auto; }
      .csp-select { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 4px; }
      .csp-input-group { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; align-items: center; }
      .csp-input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 10px; border-radius: 4px; width: 70px; font-size: 14px; }
      .csp-input:focus { outline: none; border-color: #e67e22; }
      .csp-label { color: #888; font-size: 13px; }
      .csp-btn { background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 10px; margin-top: 16px; }
      .csp-btn:hover { opacity: 0.9; }
      .csp-note { font-size: 12px; color: #888; margin-top: 12px; }
    </style>
    <div class="csp-container">
      <div class="demo-header">
        <div class="demo-title">时家奇门 | CSP 引擎 <span class="csp-badge">${methodDisplay}</span></div>
        <div class="demo-date">${now.year}年${now.month}月${now.day}日 ${now.hour}时${now.minute}分</div>
        <div class="csp-btn-group">
          <select id="select-method" class="csp-select">
            <option value="zhirun" ${currentPaiPanMethod === 'zhirun' ? 'selected' : ''}>置闰法 (Type 1)</option>
            <option value="yinpan" ${currentPaiPanMethod === 'yinpan' ? 'selected' : ''}>阴盘 (Type 2)</option>
            <option value="chaibu" ${currentPaiPanMethod === 'chaibu' ? 'selected' : ''}>拆补法 (Type 3)</option>
            <option value="maoshan" ${currentPaiPanMethod === 'maoshan' ? 'selected' : ''}>茅山法 (Type 4)</option>
          </select>
        </div>
      </div>
      <div class="csp-output">${cleanOutput || '点击「自定义起盘」查看 CSP 排盘结果'}</div>
      <div class="csp-input-group">
        <input type="number" id="input-year" class="csp-input" value="${now.year}" placeholder="年" min="1900" max="2100">
        <span class="csp-label">年</span>
        <input type="number" id="input-month" class="csp-input" value="${now.month}" placeholder="月" min="1" max="12">
        <span class="csp-label">月</span>
        <input type="number" id="input-day" class="csp-input" value="${now.day}" placeholder="日" min="1" max="31">
        <span class="csp-label">日</span>
        <input type="number" id="input-hour" class="csp-input" value="${now.hour}" placeholder="时" min="0" max="23">
        <span class="csp-label">时</span>
        <input type="number" id="input-minute" class="csp-input" value="${now.minute}" placeholder="分" min="0" max="59">
        <span class="csp-label">分</span>
        <button id="btn-custom" class="csp-btn">自定义起盘</button>
        <button id="btn-prev-hour" class="csp-btn" style="background: #e74c3c;">上一局</button>
        <button id="btn-next-hour" class="csp-btn" style="background: #27ae60;">下一局</button>
      </div>
      <div class="csp-note">✨ Powered by C++ WebAssembly</div>
    </div>
  `;
}

function render() {
  const container = document.getElementById('qimen-demo-root');
  if (!container) return;

  // Render CSP interface
  container.innerHTML = generateCspHTML(cspRawOutput, currentTime);

  bindEvents(container);

  // If WASM is loaded and output is empty (initial state), trigger a calc
  if (wasmModule && !cspRawOutput && currentTime) {
    triggerCalc();
  }
}

function bindEvents(container: HTMLElement) {
  // Bind PaiPan Method
  const selectMethod = container.querySelector('#select-method') as HTMLSelectElement;
  if (selectMethod) {
    selectMethod.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'zhirun' || val === 'yinpan' || val === 'chaibu' || val === 'maoshan') {
        currentPaiPanMethod = val;
        // Trigger calculation if we have a current time, otherwise it waits for custom input
        if (currentTime) {
          triggerCalc();
        }
      }
    });
  }

  // Bind Custom Calculation
  const btnCustom = container.querySelector('#btn-custom');
  btnCustom?.addEventListener('click', () => {
    updateTimeFromInputs(container);
  });

  // Prev/Next Hour Buttons
  const btnPrev = container.querySelector('#btn-prev-hour');
  btnPrev?.addEventListener('click', () => {
    handleTimeChange(container, -2);
  });

  const btnNext = container.querySelector('#btn-next-hour');
  btnNext?.addEventListener('click', () => {
    handleTimeChange(container, 2);
  });
}

function updateTimeFromInputs(container: HTMLElement) {
  const yearInput = container.querySelector('#input-year') as HTMLInputElement;
  const monthInput = container.querySelector('#input-month') as HTMLInputElement;
  const dayInput = container.querySelector('#input-day') as HTMLInputElement;
  const hourInput = container.querySelector('#input-hour') as HTMLInputElement;
  const minuteInput = container.querySelector('#input-minute') as HTMLInputElement;

  if (yearInput && monthInput && dayInput && hourInput && minuteInput) {
    const year = parseInt(yearInput.value);
    const month = parseInt(monthInput.value);
    const day = parseInt(dayInput.value);
    const hour = parseInt(hourInput.value);
    const minute = parseInt(minuteInput.value);

    currentTime = { year, month, day, hour, minute };
    triggerCalc();
  }
}

function handleTimeChange(container: HTMLElement, deltaHours: number) {
  // Read current inputs first (in case user changed them without clicking Custom)
  const yearInput = container.querySelector('#input-year') as HTMLInputElement;
  const monthInput = container.querySelector('#input-month') as HTMLInputElement;
  const dayInput = container.querySelector('#input-day') as HTMLInputElement;
  const hourInput = container.querySelector('#input-hour') as HTMLInputElement;
  const minuteInput = container.querySelector('#input-minute') as HTMLInputElement;

  if (yearInput && monthInput && dayInput && hourInput && minuteInput) {
    let d = new Date(
      parseInt(yearInput.value),
      parseInt(monthInput.value) - 1, // JS Month 0-11
      parseInt(dayInput.value),
      parseInt(hourInput.value),
      parseInt(minuteInput.value)
    );

    // Add hours
    d.setHours(d.getHours() + deltaHours);

    // Update currentTime
    currentTime = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes()
    };

    triggerCalc();
  }
}

function triggerCalc() {
  // CSP 引擎类型
  let cspType = 1;
  if (currentPaiPanMethod === 'zhirun') cspType = 1;
  else if (currentPaiPanMethod === 'yinpan') cspType = 2;
  else if (currentPaiPanMethod === 'chaibu') cspType = 3;
  else if (currentPaiPanMethod === 'maoshan') cspType = 4;

  if (currentTime) {
    callCspEngine(currentTime, cspType).then(output => {
      cspRawOutput = output;
      render();
    });
  }
}

