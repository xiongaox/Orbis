/**
 * lunar-javascript 类型声明
 * 由于该库没有官方类型声明，这里提供基本的类型定义
 */

declare module 'lunar-javascript' {
    export class Solar {
        static fromYmd(year: number, month: number, day: number): Solar;
        static fromYmdHms(
            year: number,
            month: number,
            day: number,
            hour: number,
            minute: number,
            second: number
        ): Solar;
        getYear(): number;
        getMonth(): number;
        getDay(): number;
        getHour(): number;
        getMinute(): number;
        getSecond(): number;
        getLunar(): Lunar;
    }

    export class Lunar {
        getYear(): number;
        getMonth(): number;
        getDay(): number;
        getEightChar(): EightChar;
        getPrevJieQi(): JieQi;
        getNextJieQi(): JieQi;
    }

    export class EightChar {
        getYear(): string;
        getMonth(): string;
        getDay(): string;
        getTime(): string;
    }

    export class JieQi {
        getName(): string;
        getSolar(): Solar;
    }
}
