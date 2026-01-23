
import * as readline from 'readline';
import { calculateWangShuai, WangShuaiResult } from './wangShuai.ts';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 检查命令行参数
const args = process.argv.slice(2);
if (args.length === 4) {
    runOnce(args);
} else {
    // 交互模式
    console.log('🐯 旺衰算法独立测试终端 🐯');
    console.log('请输入四柱（格式：年柱 月柱 日柱 时柱，例如：甲子 乙丑 丙寅 丁卯）');
    console.log('输入 "exit" 或 "quit" 退出');
    prompt();
}

function runOnce(parts: string[]) {
    try {
        const pillars = parts.map(p => {
            if (p.length !== 2) throw new Error(`柱格式错误: ${p}`);
            return { tiangan: p[0], dizhi: p[1] };
        });

        console.log('⏳ 计算中...');
        const start = process.hrtime();
        const result = calculateWangShuai(pillars);
        const end = process.hrtime(start);
        const timeInMs = (end[0] * 1000 + end[1] / 1e6).toFixed(3);

        printResult(result, timeInMs);
        process.exit(0);

    } catch (e: any) {
        console.error(`❌ 错误: ${e.message}`);
        process.exit(1);
    }
}

function prompt() {
    rl.question('\n> 请输入八字: ', (answer) => {
        if (answer.trim().toLowerCase() === 'exit' || answer.trim().toLowerCase() === 'quit') {
            rl.close();
            return;
        }

        try {
            const parts = answer.trim().split(/\s+/);
            if (parts.length !== 4) {
                console.error('❌ 格式错误：请输入4个柱，用空格分隔。');
                prompt();
                return;
            }

            const pillars = parts.map(p => {
                if (p.length !== 2) throw new Error(`柱格式错误: ${p}`);
                return { tiangan: p[0], dizhi: p[1] };
            });

            console.log('⏳ 计算中...');
            const start = process.hrtime();
            const result = calculateWangShuai(pillars);
            const end = process.hrtime(start);
            const timeInMs = (end[0] * 1000 + end[1] / 1e6).toFixed(3);

            printResult(result, timeInMs);

        } catch (e: any) {
            console.error(`❌ 错误: ${e.message}`);
        }

        prompt();
    });
}

function printResult(res: WangShuaiResult, time: string) {
    console.log('\n========================================');
    console.log(`📊 计算结果 (耗时 ${time}ms)`);
    console.log('========================================');
    console.log(`🔹 八字: ${res.bazi}`);
    console.log(`🔹 判定: ${res.verdict} (${res.bodyStrength})`);
    console.log(`🔹 得分: ${res.zScore}`);
    console.log(`🔹 格局: ${res.formalPattern} | ${res.calcPattern}`);
    console.log('----------------------------------------');
    console.log(`✨ 喜用神: ${res.joyGods.join(', ') || '无'}`);
    console.log(`💀 忌神:   ${res.jiGods.join(', ') || '无'}`);

    if (res.physicsLog.length > 0) {
        console.log('----------------------------------------');
        console.log('📜 物理逻辑日志:');
        res.physicsLog.forEach(log => console.log(`   ${log}`));
    }
    console.log('========================================');
}

prompt();
