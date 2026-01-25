import { parseQimenImportData } from './src/utils/qimenImportUtils';

const testData = [
    {
        "公历时间": "2024-02-04 12:30",
        "事情描述": "Test Description",
        "事件反馈": "Test Feedback",
        "案例断法": "Test Analysis",
        "阴阳遁几局": "阳遁五局",
        "分类": "生意财运"
    },
    {
        "title": "English Key Case",
        "test_date": "2023-01-01 12:00",
        "category": "work"
    }
];

const results = parseQimenImportData(testData);

console.log(JSON.stringify(results, null, 2));

if (results.length !== 2) {
    console.error("FAIL: Expected 2 results");
    process.exit(1);
}

const case1 = results[0];
if (case1.qimen_data?.custom_ju !== 5 || case1.qimen_data?.custom_dun !== '阳') {
    console.error("FAIL: Ju parsing failed", case1.qimen_data);
    process.exit(1);
}

if (case1.category !== 'wealth') {
    console.error("FAIL: Category mapping failed", case1.category);
    process.exit(1);
}

console.log("SUCCESS: Parsing logic verified.");
