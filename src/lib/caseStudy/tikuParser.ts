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
    /** 选项，按 A、B、C… 顺序；填空题为空数组 */
    options: Array<{ key: string; text: string }>;
    /** 选择题为正确答案字母（多答案连写如「BH」）；填空题为参考答案文本（如「2008」） */
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
    /** 出生地（从出生描述里拆出，如「香港」）；取不到为空串 */
    birthPlace: string;
    /** 出生时间描述：去掉出生地后的原文（卷头主标题用），避免与「出生地」一行重复 */
    birthText: string;
    /** 原稿给出的四柱，如「甲戌 甲戌 甲午 戊辰」；第 17 届原稿无八字 */
    bazi: string;
    /** 命题提供者 */
    provider: string;
    /** 命例备注（原稿「备注1/备注2」，短提示） */
    notes: string[];
    /**
     * 补充信息：提纲里除性别/八字/命题人/备注之外的正文，
     * 如「一生描述」「发生事项」「已知事情」。
     * 反推时辰题全靠这些线索，不能丢。
     */
    supplements: Array<{ label: string; text: string }>;
    /** 排盘用的公历出生时间（解析失败为 null） */
    birthTime: { year: number; month: number; day: number; hour: number; minute: number } | null;
    /** 该命例下的题目 */
    questions: TikuQuestion[];
}

/** 一届（一个 Markdown 文件）；赛事用「届」、百群联赛这类连续赛事用「期」，仅显示名不同 */
export interface TikuEdition {
    id: string;
    /** 显示名，如「第17届」「第1517期」 */
    name: string;
    /** 序号（届号/期号），用于同年内排序 */
    no: number;
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

/**
 * 作答判定：单选题 answer 是单字母；联赛流年题允许多事项并列（如「BH」），
 * 单选交互下选到任一正确字母即算对。
 */
export function isCorrectTikuPick(answer: string, picked: string | null): boolean {
    if (!picked) return false;
    return answer.includes(picked);
}

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
/**
 * 解析一个块（`---` 分隔）为一组题。同一命例的多道题共用一份提纲时合并为一块，
 * 以「Q数字：」行开新题；也兼容旧稿「一题一块」。残缺题（无答案）整题丢弃。
 */
function parseBlock(block: string, editionId: string): Array<{ question: TikuQuestion; outline: Record<string, string> }> {
    const lines = block.split(/\r?\n/);

    // 提纲行集中在第一题之前
    const outlineEnd = lines.findIndex((l) => /^Q\d+[：:]/.test(l.trim()));
    if (outlineEnd < 0) return [];
    const outline = parseOutline(lines.slice(0, outlineEnd));

    const results: Array<{ question: TikuQuestion; outline: Record<string, string> }> = [];
    let no = 0;
    let stemLines: string[] = [];
    let options: Array<{ key: string; text: string }> = [];
    let answer = '';
    let notes: string[] = [];

    const flush = () => {
        if (no > 0 && answer) {
            results.push({
                question: {
                    id: `${editionId}-q${String(no).padStart(2, '0')}`,
                    no,
                    stem: stemLines.filter(Boolean).join('\n'),
                    options,
                    // 填空题没有选项，answer 即参考答案文本（如年份）
                    answer,
                    notes,
                },
                outline,
            });
        }
        no = 0;
        stemLines = [];
        options = [];
        answer = '';
        notes = [];
    };

    for (let i = outlineEnd; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const qMatch = line.match(/^Q(\d+)[：:]\s*(.*)$/);
        if (qMatch) {
            flush();
            no = Number(qMatch[1]);
            stemLines = [qMatch[2].trim()];
            continue;
        }

        const answerMatch = line.match(/^Q\d+正确答案是[：:]\s*([A-Z]{1,2}|\d[\d.,、，/\s]*\d)/);
        if (answerMatch) {
            answer = answerMatch[1];
            flush();
            continue;
        }

        const optMatch = line.match(/^([A-Z])\s+(.+)$/);
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
    flush();

    return results;
}

/** 从文件路径取届/期 id、名称与年份，如 `全球算命师大赛_第17届_2026.md`、`铁口箓百群联赛_第1517期_2026.md` */
function parseEditionMeta(path: string): { id: string; name: string; no: number; year: number } | null {
    const file = path.split('/').pop() ?? '';
    const m = file.match(/第\s*(\d+)\s*(届|期)[_-](\d{4})/);
    if (!m) return null;
    const no = Number(m[1]);
    return { id: `e${String(no).padStart(2, '0')}`, name: `第${no}${m[2]}`, no, year: Number(m[3]) };
}

/**
 * 把「1、…； 2、…； 3、…」这类有序描述拆成逐条。
 * 原稿的「一生描述」「发生事项」是一条长段落，序号只用来分点；拆开后每点单独成行，
 * 长案例（十几条事项）才读得下去。没有序号时原样返回一条。
 */
export function splitNumberedItems(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    // 序号形如「1、」「12、」，前面不能紧跟数字（避免切进 1972 这类年份）
    const parts = trimmed
        .split(/(?<!\d)(?=\d{1,2}\s*[、．.])/)
        .map((s) => s.trim().replace(/[；;]\s*$/, '').trim())
        .filter(Boolean);
    return parts.length > 1 ? parts : [trimmed];
}

/**
 * 从出生描述里取出生地。原稿有两种写法：
 * - 地名在末尾：「公历1982年6月12日 早上6点50分 香港出生」
 * - 地名在开头：「台湾高雄 公历1999年8月14日 15点30分（申时）」
 * 取不到就返回空串，卷头相应不显示该行。
 */
export function parseTikuBirthPlace(birth: string): string {
    if (!birth) return '';
    // 末尾「XX出生」：允许地名带空格（如「日本宫崎县」）
    const tail = birth.match(/([^\d\s，,]{1,12})\s*出生\s*$/);
    if (tail) return tail[1].trim();
    // 开头地名：公历之前、不是时间描述的那一段
    const head = birth.match(/^\s*([^\d]{2,12}?)\s*公历/);
    if (head) {
        const place = head[1].trim();
        // 「上午5-6点」这类时间词会误命中，排除含时间关键词的
        if (place && !/上午|下午|早上|晚上|凌晨|点|时/.test(place)) return place;
    }
    return '';
}

/** 去掉出生地后的出生时间描述（卷头主标题用）。只在首尾出现处剥离，不做全局替换 */
export function stripBirthPlace(birth: string, place: string): string {
    if (!place) return birth.trim();
    let text = birth.trim();
    // 末尾「XX出生」整体去掉
    text = text.replace(new RegExp(`\\s*${escapeRegExp(place)}\\s*出生\\s*$`), '');
    // 开头「XX 公历…」去掉地名
    text = text.replace(new RegExp(`^\\s*${escapeRegExp(place)}\\s*`), '');
    return text.replace(/\s*出生\s*$/, '').trim();
}

/** 地名里的字符按字面匹配（避免「.」「(」等被当正则元字符） */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 解析一份届次 Markdown */
export function parseTikuEdition(path: string, content: string): TikuEdition | null {
    const meta = parseEditionMeta(path);
    if (!meta) return null;

    const volumes: TikuVolume[] = [];
    // 同一命例的题在原文里连续出现，按「出生 + 八字 + 命题人」判定同一张命例
    const keyToVolume = new Map<string, TikuVolume>();

    for (const block of content.split(/\n-{3,}\s*\n/)) {
        for (const { question, outline } of parseBlock(block, meta.id)) {
        // 原稿性别行写法有「男命 / 女命 / 坤造 / 乾造」，缺任一都会被当成信息缺失
        const genderKey = outline['男命'] !== undefined ? '男命'
            : outline['女命'] !== undefined ? '女命'
            : outline['乾造'] !== undefined ? '乾造'
            : outline['坤造'] !== undefined ? '坤造'
            : null;
        const genderText: TikuVolume['gender'] = genderKey === '男命' || genderKey === '乾造'
            ? '男命'
            : genderKey === '女命' || genderKey === '坤造' ? '女命' : null;
        const birth = (genderKey ? outline[genderKey] : '').trim();
        const bazi = (outline['八字'] || '').trim();
        const provider = (outline['命题提供者'] || '').trim();

        const notes = Object.entries(outline)
            .filter(([k]) => /^备注/.test(k))
            .map(([, v]) => v)
            .filter(Boolean);

        // 其余提纲字段都是命例背景（一生描述 / 发生事项 / 已知事情 …），
        // 反推时辰题缺了这些线索就无从下手，必须随卷展示
        const KNOWN_KEYS = new Set(['男命', '女命', '乾造', '坤造', '八字', '命题提供者']);
        const supplements = Object.entries(outline)
            .filter(([k, v]) => !KNOWN_KEYS.has(k) && !/^备注/.test(k) && Boolean(v))
            .map(([label, text]) => ({ label, text }));

        const key = `${birth}|${bazi}|${provider}`;
        let volume = keyToVolume.get(key);
        if (!volume) {
            volume = {
                id: `${meta.id}-v${String(volumes.length + 1).padStart(2, '0')}`,
                index: volumes.length,
                gender: genderText,
                birth,
                birthPlace: parseTikuBirthPlace(birth),
                birthText: stripBirthPlace(birth, parseTikuBirthPlace(birth)),
                bazi,
                provider: provider && provider !== '-' ? provider : '',
                notes,
                supplements,
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
        for (const item of supplements) {
            if (!volume.supplements.some((s) => s.label === item.label && s.text === item.text)) {
                volume.supplements.push(item);
            }
        }
        volume.questions.push(question);
        }
    }

    if (volumes.length === 0) return null;
    return { ...meta, volumes };
}

/** 解析整个题库目录（键为文件路径） */
export function parseTikuBank(id: string, name: string, files: Record<string, string>): TikuBank {
    const editions = Object.entries(files)
        .map(([path, content]) => parseTikuEdition(path, content))
        .filter((e): e is TikuEdition => e !== null)
        .sort((a, b) => a.year - b.year || a.no - b.no);
    return { id, name, editions };
}
