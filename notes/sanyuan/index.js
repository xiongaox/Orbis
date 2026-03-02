// 三元天星盘 - 页面交互逻辑
// 此文件包含 UI 组件和页面渲染逻辑，与核心算法 (index.js) 分离

// ============================================
// Custom Select Component - 自定义下拉框组件
// ============================================
class CustomSelect {
    constructor(container, hiddenSelect) {
        this.container = container;
        this.hiddenSelect = hiddenSelect;
        this.trigger = container.querySelector('.custom-select-trigger');
        this.valueDisplay = container.querySelector('.custom-select-value');
        this.optionsContainer = container.querySelector('.custom-select-options');

        this.init();
    }

    init() {
        // Build options from hidden select
        this.buildOptions();

        // Toggle dropdown
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on outside click
        document.addEventListener('click', () => this.close());
    }

    buildOptions() {
        this.optionsContainer.innerHTML = '';
        Array.from(this.hiddenSelect.options).forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'custom-select-option';
            if (idx === this.hiddenSelect.selectedIndex) {
                div.classList.add('selected');
            }
            div.textContent = opt.text;
            div.dataset.value = opt.value;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                this.select(idx, opt.text, opt.value);
            });
            this.optionsContainer.appendChild(div);
        });
    }

    toggle() {
        // Close other dropdowns
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== this.container) el.classList.remove('open');
        });
        this.container.classList.toggle('open');
    }

    close() {
        this.container.classList.remove('open');
    }

    select(index, text, value) {
        this.hiddenSelect.selectedIndex = index;
        this.valueDisplay.textContent = text;

        // Update selected state
        this.optionsContainer.querySelectorAll('.custom-select-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });

        this.close();
    }
}

// ============================================
// 24山向数据
// ============================================
const directions = [
    { mountain: "壬", facing: "丙", label: "壬山丙向" },
    { mountain: "子", facing: "午", label: "子山午向" },
    { mountain: "癸", facing: "丁", label: "癸山丁向" },
    { mountain: "丑", facing: "未", label: "丑山未向" },
    { mountain: "艮", facing: "坤", label: "艮山坤向" },
    { mountain: "寅", facing: "申", label: "寅山申向" },
    { mountain: "甲", facing: "庚", label: "甲山庚向" },
    { mountain: "卯", facing: "酉", label: "卯山酉向" },
    { mountain: "乙", facing: "辛", label: "乙山辛向" },
    { mountain: "辰", facing: "戌", label: "辰山戌向" },
    { mountain: "巽", facing: "乾", label: "巽山乾向" },
    { mountain: "巳", facing: "亥", label: "巳山亥向" },
    { mountain: "丙", facing: "壬", label: "丙山壬向" },
    { mountain: "午", facing: "子", label: "午山子向" },
    { mountain: "丁", facing: "癸", label: "丁山癸向" },
    { mountain: "未", facing: "丑", label: "未山丑向" },
    { mountain: "坤", facing: "艮", label: "坤山艮向" },
    { mountain: "申", facing: "寅", label: "申山寅向" },
    { mountain: "庚", facing: "甲", label: "庚山甲向" },
    { mountain: "酉", facing: "卯", label: "酉山卯向" },
    { mountain: "辛", facing: "乙", label: "辛山乙向" },
    { mountain: "戌", facing: "辰", label: "戌山辰向" },
    { mountain: "乾", facing: "巽", label: "乾山巽向" },
    { mountain: "亥", facing: "巳", label: "亥山巳向" },
];

// ============================================
// 页面初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const dirSel = document.getElementById("direction");
    const yunSel = document.getElementById("yun");
    const tiSel = document.getElementById("tiGua");

    // 填充山向下拉框
    directions.forEach((d, i) => {
        dirSel.add(new Option(d.label, i));
    });

    // 填充元运下拉框
    for (let i = 1; i <= 9; i++) {
        yunSel.add(new Option(`${i}运`, i));
    }

    dirSel.value = "0"; // 默认壬山丙向
    yunSel.value = "9"; // 默认9运

    // Initialize custom selects
    new CustomSelect(document.getElementById('directionSelect'), dirSel);
    new CustomSelect(document.getElementById('yunSelect'), yunSel);
    new CustomSelect(document.getElementById('tiGuaSelect'), tiSel);

    const resultEl = document.getElementById("result");

    // ============================================
    // 渲染盘面
    // ============================================
    function renderBoard(title, board) {
        const card = document.createElement("div");
        card.className = "card";
        const h = document.createElement("h3");
        h.textContent = title;
        card.appendChild(h);
        const table = document.createElement("table");
        table.className = "grid";

        const row1 = document.createElement("tr");
        ["Li", "Xun", "Kun", "Dui"].forEach((p) => {
            const td = document.createElement("td");
            td.textContent = board[p] ?? "";
            row1.appendChild(td);
        });
        table.appendChild(row1);

        const row2 = document.createElement("tr");
        ["Qian", "Gen", "Kan", "Zhen"].forEach((p) => {
            const td = document.createElement("td");
            td.textContent = board[p] ?? "";
            row2.appendChild(td);
        });
        table.appendChild(row2);

        card.appendChild(table);
        return card;
    }

    // ============================================
    // 表单提交处理
    // ============================================
    function handleSubmit(e) {
        e.preventDefault();
        const dir = directions[Number(dirSel.value)];
        const params = {
            yun: Number(yunSel.value),
            mountain: dir.mountain,
            facing: dir.facing,
            isTiGua: tiSel.value === "true",
            yuanPhase: "lower",
        };
        try {
            const left = SanYuan.computeBigXuanKong(params.mountain, params.yuanPhase);
            const yunPan = SanYuan.computeYunPan(params.yun);
            const shan = SanYuan.computeMountainPan(
                yunPan,
                params.mountain,
                params.isTiGua,
                params.yuanPhase,
            );
            const xiang = SanYuan.computeFacingPan(
                yunPan,
                params.facing,
                params.isTiGua,
                params.yuanPhase,
            );
            const earth = SanYuan.computeEarthBoard(params.mountain);
            const water = SanYuan.computeWaterBoard(params.facing);
            const heaven = SanYuan.computeHeavenBoard(params.mountain);

            // 获取盘头信息
            const headerInfo = SanYuan.getHeaderInfo(params.yun, params.mountain, params.facing, params.isTiGua);

            // 渲染盘头
            const headerEl = document.getElementById("header");
            headerEl.innerHTML = `
          <div class="pan-header">
            <div class="pan-header-left">
              ${params.mountain}山${params.facing}向 · ${params.yun}运${headerInfo.panType}
            </div>
            <div class="pan-header-right">
              <div class="pan-header-item">
                <div class="pan-header-num">${headerInfo.shanStart}</div>
                <div class="pan-header-label">山星</div>
              </div>
              <div class="pan-header-item">
                <div class="pan-header-num">${headerInfo.xiangStart}</div>
                <div class="pan-header-label">向星</div>
              </div>
              <div class="pan-header-item">
                <div class="pan-header-num">${params.yun}</div>
                <div class="pan-header-label">运</div>
              </div>
            </div>
          </div>
        `;

            resultEl.innerHTML = "";
            resultEl.appendChild(renderBoard("左盘 大玄空数", left));
            resultEl.appendChild(renderBoard("右盘 运星", yunPan));
            resultEl.appendChild(renderBoard("右盘 山星", shan));
            resultEl.appendChild(renderBoard("右盘 向星", xiang));
            resultEl.appendChild(renderBoard("下盘 地母翻卦（地）", earth));
            resultEl.appendChild(renderBoard("下盘 辅星水法（天）", water));
            resultEl.appendChild(renderBoard("下盘 天星阳宅（人）", heaven));
        } catch (err) {
            alert(err.message || String(err));
        }
    }

    document.getElementById("form").addEventListener("submit", handleSubmit);
    // 初始计算一次
    handleSubmit(new Event("submit"));
});
