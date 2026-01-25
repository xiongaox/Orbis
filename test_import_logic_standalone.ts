
// Mock types for standalone test
const QIMEN_CATEGORIES = [
    { id: 'work', name: '工作事业' },
    { id: 'study', name: '求学考试' },
    { id: 'love', name: '恋爱婚姻' },
    { id: 'wealth', name: '生意财运' },
    { id: 'lost', name: '失物失人' },
    { id: 'travel', name: '出行出国' },
    { id: 'health', name: '疾病身体' },
    { id: 'other', name: '其他杂项' },
];

const FIELD_MAPPING: Record<string, string> = {
    '公历时间': 'test_date',
    '标题': 'title',
    '事情描述': 'description',
    '事件反馈': 'feedback',
    '案例断法': 'analysis',
    '分类': 'category',
    '阴阳遁几局': 'ju_text',
    'title': 'title',
    'test_date': 'test_date',
    'description': 'description',
    'feedback': 'feedback',
    'analysis': 'analysis',
    'category': 'category',
    'qimen_data': 'qimen_data'
};

const CATEGORY_NAME_MAP: Record<string, string> = {};
QIMEN_CATEGORIES.forEach(cat => {
    CATEGORY_NAME_MAP[cat.name] = cat.id;
    CATEGORY_NAME_MAP[cat.id] = cat.id;
});

function parseJuText(text: string) {
    if (!text) return null;
    const match = text.match(/([阴阳])遁([一二三四五六七八九]|\d+)局/);
    if (!match) return null;
    const dun = match[1];
    const juStr = match[2];
    let ju = parseInt(juStr);
    if (isNaN(ju)) {
        const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        const idx = chineseNums.indexOf(juStr);
        if (idx !== -1) ju = idx + 1;
    }
    return { dun, ju };
}

function parseQimenImportData(jsonData: any[]) {
    const inputs = Array.isArray(jsonData) ? jsonData : [jsonData];
    const validCases: any[] = [];

    for (const item of inputs) {
        const caseInput: any = {
            title: '',
            test_date: '',
            category: 'other',
            tags: [],
        };
        let juText = '';

        for (const [key, value] of Object.entries(item)) {
            if (!value) continue;
            const cleanKey = key.trim();
            const mappedKey = FIELD_MAPPING[cleanKey];
            if (mappedKey) {
                if (mappedKey === 'ju_text') {
                    juText = String(value);
                } else {
                    caseInput[mappedKey] = value;
                }
            }
        }

        if (caseInput.test_date) {
            const dateStr = String(caseInput.test_date).replace(' ', 'T');
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                caseInput.test_date = date.toISOString();
            } else {
                continue;
            }
        } else {
            continue;
        }

        if (caseInput.category) {
            const catId = CATEGORY_NAME_MAP[String(caseInput.category)];
            if (catId) {
                caseInput.category = catId;
            } else {
                caseInput.category = 'other';
            }
        }

        if (!caseInput.title && caseInput.description) {
            caseInput.title = String(caseInput.description).substring(0, 20) + (String(caseInput.description).length > 20 ? '...' : '');
        } else if (!caseInput.title) {
            caseInput.title = '未命名案例';
        }

        if (juText) {
            const parsed = parseJuText(juText);
            if (parsed) {
                caseInput.qimen_data = {
                    ...(caseInput.qimen_data || {}),
                    custom_ju: parsed.ju,
                    custom_dun: parsed.dun
                };
            }
        }
        validCases.push(caseInput);
    }
    return validCases;
}

// TEST EXECUTION
const testData = [
    {
        "公历时间": "2024-02-04 12:30",
        "事情描述": "Test Description",
        "事件反馈": "Test Feedback",
        "案例断法": "Test Analysis",
        "阴阳遁几局": "阳遁五局",
        "分类": "生意财运"
    }
];

const results = parseQimenImportData(testData);
console.log(JSON.stringify(results, null, 2));

if (results.length !== 1) process.exit(1);
const c = results[0];
if (c.qimen_data.custom_ju !== 5) process.exit(1);
if (c.category !== 'wealth') process.exit(1);

console.log("SUCCESS");
