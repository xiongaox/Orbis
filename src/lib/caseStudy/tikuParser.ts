/**
 * 题库（命例成组）解析层
 *
 * 原始语料是「一题一块」的扁平 Markdown：每个 `---` 分隔块里重复一次提纲
 * （男命/女命 + 公历 + 八字 + 命题提供者），再跟一道题与答案。
 * 这里把同一命例的连续题目聚合成一张「命例卷」，命例信息只保留一份，
 * 排盘所需的公历与性别也从提纲里提取出来。
 */

/** 命例卷里的一道题 */
export interface TikuQuestion {
    /** 全局唯一：`${editionId}-q${no} 已补齐两位` */
    id: string;
    /** 题号（该届内自 1 开始） */
    no: number;
    /** 题干；多行题干以 `\n` 连接，首行是问句 */
    stem: string;
    /** 选项，按 A、B、C… 顺序 */
    options: Array<{ key: string; text: string }>;
    /** 正确答案字母 */
    answer: string;
    /** 备注（原稿「备注1/备注2」等），供复盘时参考 */
    notes: string[];
}

/** 一张命例（同一位师傅的一组题共用一份命盘信息） */
export interface TikuVolume {
    /** 全局唯一：`${editionId}-v${序号}` */
    id: string;
    /** 该届内序号，从 0 开始 */
    index: number;
    /** 男命 / 女命 */
    gender: '男命' | '女命' | null;
    /** 原始出生描述，如「公历1982年6月12日 早上6点50分 香港出生」 */
    birth: string;
    /** 原稿给出的四柱，如「甲戌 甲戌 甲午 戊辰」；第 17 届原稿无八字 */
    bazi: string;
    /** 命题提供者 */
    provider: string;
    /** 命例备注 */
    notes: string[];
    /** 排盘用的公历出生时间（解析失败为 null） */
    birthTime: { year: number; month: number; day: number; hour: number; minute: number } | null;
    /** 该命例下的题目 */
    questions: TikuQuestion[];
}

/** 一届（一个 Markdown 文件） */
export interface TikuEdition {
    id: string;
    /** 显示名，如「第17届」 */
    name: string;
    /** 年份 */
    year: number;
    volumes: TikuVolume[];
}

/** 题库（一个 Markdown 目录 / 一个赛事） */
export interface TikuBank {
    id: string;
    name: string;
    editions: TikuEdition[];
}

const ZHI_HOUR: Record<string, number> = {
    子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10,
    午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22,
};

/** 提纲行里「- key：value」的解析 */
function parseOutline(lines: string[]) {
    const out: Record<string, string> = {};
    for (const line of lines) {
        const m = line.match(/^-\s*([^：:]+)[：:]\s*(.*)$/);
        if (m) out[m[1].trim()] = m[2].trim();
    }
    return out;
}

/**
 * 从出生描述里取公历时间。
 * 原稿写法很杂：「公历1982年6月12日 早上6点50分」「20时05分」「15点30分（申时）」
 * 「上午5-6点」「寅时」；拿不到具体分钟就按 0 分，只有时辰就取该时辰起点。
 */
export function parseTikuBirthTime(birth: string): TikuVolume['birthTime'] {
    if (!birth) return null;

    const dateMatch = birth.match(/公历\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) return null;
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    // 原稿有「公历192年」这类缺位写法，年份不合理时不做排盘，避免给出错盘
    if (year < 1800 || year > 2200) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    let hour: number | null = null;
    let minute = 0;

    // 「早上6点50分」「20时05分」「15点30分」
    const clockMatch = birth.match(/(\d{1,2})\s*[点时]\s*(\d{1,2})?\s*分?/);
    if (clockMatch) {
        hour = Number(clockMatch[1]);
        if (clockMatch[2]) minute = Number(clockMatch[2]);
        if (/下午|晚上/.test(birth) && hour < 12) hour += 12;
        if (/上午|早上|凌晨/.test(birth) && hour === 12) hour = 0;
    }

    // 只有「上午5-6点」这种区间，取起点
    if (hour === null) {
        const rangeMatch = birth.match(/(\d{1,2})\s*[-~－]\s*(\d{1,2})\s*点/);
        if (rangeMatch) {
            hour = Number(rangeMatch[1]);
            if (/下午|晚上/.test(birth) && hour < 12) hour += 12;
        }
    }

    // 兜底：按地支时辰取起点
    if (hour === null) {
        const zhiMatch = birth.match(/([子丑寅卯辰巳午未申酉戌亥])时/);
        if (zhiMatch && ZHI_HOUR[zhiMatch[1]] !== undefined) hour = ZHI_HOUR[zhiMatch[1]];
    }

    if (hour === null || hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) minute = 0;

    return { year, month, day, hour, minute };
}

/** 把一节（一题）的文本解析成题干、选项、答案 */
function parseBlock(block: string, editionId: string): { question: TikuQuestion; outline: Record<string, string> } | null {
    const lines = block.split(/\r?\n/);

    // 提纲行集中在题目前面
    const outlineEnd = lines.findIndex((l) => /^Q\d+[：:]/.test(l.trim()));
    const outline = parseOutline(outlineEnd >= 0 ? lines.slice(0, outlineEnd) : lines.slice(0, 0));
    if (outlineEnd < 0) return null;

    const qLine = lines[outlineEnd].trim();
    const qMatch = qLine.match(/^Q(\d+)[：:]\s*(.*)$/);
    if (!qMatch) return null;
    const no = Number(qMatch[1]);
    const stemLines = [qMatch[2].trim()];

    const options: Array<{ key: string; text: string }> = [];
    let answer = '';
    const notes: string[] = [];

    for (let i = outlineEnd + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const answerMatch = line.match(/^Q\d+正确答案是[：:]\s*([A-E])/);
        if (answerMatch) {
            answer = answerMatch[1];
            continue;
        }

        const optMatch = line.match(/^([A-E])\s+(.+)$/);
        if (optMatch && !answer) {
            options.push({ key: optMatch[1], text: optMatch[2].trim() });
            continue;
        }

        // 题干续行：出现在选项之前、非提纲的正文
        if (options.length === 0 && !/^-\s*[^：:]+[：:]/.test(line)) {
            stemLines.push(line);
            continue;
        }

        const noteMatch = line.match(/^-\s*备注\d*[：:]\s*(.+)$/);
        if (noteMatch) notes.push(noteMatch[1].trim());
    }

    if (options.length === 0 || !answer) return null;

    return {
        question: {
            id: `${editionId}-q${String(no).padStart(2, '0')}`,
            no,
            stem: stemLines.filter(Boolean).join('\n'),
            options,
            answer,
            notes,
        },
        outline,
    };
}

/** 从文件路径取届次 id、名称与年份，如 `全球算命师大赛_第17届_2026.md` */
function parseEditionMeta(path: string): { id: string; name: string; year: number } | null {
    const file = path.split('/').pop() ?? '';
    const m = file.match(/第\s*(\d+)\s*届[_-](\d{4})/);
    if (!m) return null;
    const no = Number(m[1]);
    return { id: `e${String(no).padStart(2, '0')}`, name: `第${no}届`, year: Number(m[2]) };
}

/** 解析一份届次 Markdown */
export function parseTikuEdition(path: string, content: string): TikuEdition | null {
    const meta = parseEditionMeta(path);
    if (!meta) return null;

    const volumes: TikuVolume[] = [];
    // 同一命例的题在原文里连续出现，按「出生 + 八字 + 命题人」判定同一张命例
    const keyToVolume = new Map<string, TikuVolume>();

    for (const block of content.split(/\n-{3,}\s*\n/)) {
        const parsed = parseBlock(block, meta.id);
        if (!parsed) continue;

        const { question, outline } = parsed;
        const genderText = outline['男命'] ? '男命' : outline['女命'] ? '女命' : null;
        const birth = (outline['男命'] || outline['女命'] || '').trim();
        const bazi = (outline['八字'] || '').trim();
        const provider = (outline['命题提供者'] || '').trim();

        const notes = Object.entries(outline)
            .filter(([k]) => /^备注/.test(k))
            .map(([, v]) => v)
            .filter(Boolean);

        const key = `${birth}|${bazi}|${provider}`;
        let volume = keyToVolume.get(key);
        if (!volume) {
            volume = {
                id: `${meta.id}-v${String(volumes.length + 1).padStart(2, '0')}`,
                index: volumes.length,
                gender: genderText,
                birth,
                bazi,
                provider: provider && provider !== '-' ? provider : '',
                notes,
                birthTime: parseTikuBirthTime(birth),
                questions: [],
            };
            keyToVolume.set(key, volume);
            volumes.push(volume);
        }

        // 同一命例的备注只留一份
        for (const note of notes) {
            if (!volume.notes.includes(note)) volume.notes.push(note);
        }
        volume.questions.push(question);
    }

    if (volumes.length === 0) return null;
    return { ...meta, volumes };
}

/** 解析整个题库目录（键为文件路径） */
export function parseTikuBank(id: string, name: string, files: Record<string, string>): TikuBank {
    const editions = Object.entries(files)
        .map(([path, content]) => parseTikuEdition(path, content))
        .filter((e): e is TikuEdition => e !== null)
        .sort((a, b) => a.year - b.year);
    return { id, name, editions };
}
