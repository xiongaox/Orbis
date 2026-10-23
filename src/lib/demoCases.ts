/**
 * 模块定位：
 * - 所在层级：领域数据层（与 mobileNavStorage / lockedChartStorage 同层）
 * - 主要目标：首次启动时内置两条示例案例，让新用户一开箱就有可点的样例
 *
 * 为什么放在代码里而不是 public 下的 json：
 * - 示例要随安装包走，且必须能被案例库当成真实案例（可打开、可看生平与详情）
 * - 只有写进本地私有存储，列表、详情、排盘、生平时间轴才会走正常链路；
 *   塞一份只读占位会让这些地方各写一套判断
 *
 * 数据来源：作者本人导出的真实案例，生平时间轴、排盘数据、案例正文全部原样保留。
 * 新用户第一次打开就能看到一个完整案例该长什么样，而不是空壳。
 * 时间字段沿用库内既有格式（ISO 字符串），与新建 / 编辑案例写库时一致。
 *
 * 幂等：用固定 id 写入，并记一个「已投放」标记。
 * 用户删掉示例后不会再被塞回来——删除是明确的用户意图。
 */
import { type CreateCaseInput } from '../services/baziCaseService';
import { type CreateQimenCaseInput } from '../services/qimenCaseService';
import { localPrivateStore } from '../services/localPrivateStore';
import { readSetting, writeSetting } from '../services/appSettingStore';

/** 内置示例的固定 id：写库与查重都认这个前缀 */
export const DEMO_BAZI_CASE_ID = 'demo-bazi-liangxiangrun';
export const DEMO_QIMEN_CASE_ID = 'demo-qimen-1970female';

/**
 * 八字示例：梁湘润。
 * 含 21 条生平记录与完整排盘数据，与作者本机导出记录逐字段一致。
 */
export const DEMO_BAZI_CASE: CreateCaseInput = {
    name: '【示例】梁湘润',
    gender: 'male',
    // 1930-04-20 05:00（本地时间）对应的 UTC 时刻，与库里新建案例的写法一致
    birth_date: '1930-04-19T21:00:00.000Z',
    tags: ['名人'],
    notes: '',
    bazi_data: {
        year_pillar: '庚午',
        month_pillar: '庚辰',
        day_pillar: '庚子',
        hour_pillar: '己卯',
        main_stars: ['比肩', '比肩', '日主', '正印'],
        hidden_stems: [
            [
                { stem: '丁', god: '正官' },
                { stem: '己', god: '正印' },
            ],
            [
                { stem: '戊', god: '偏印' },
                { stem: '乙', god: '正财' },
                { stem: '癸', god: '伤官' },
            ],
            [
                { stem: '癸', god: '伤官' },
            ],
            [
                { stem: '乙', god: '正财' },
            ],
        ],
        star_lucks: ['沐浴', '养', '死', '胎'],
        self_sitting: ['沐浴', '养', '死', '病'],
        na_yin: ['路旁土', '白蜡金', '壁上土', '城头土'],
        kong_wang: ['戌亥', '申酉', '辰巳', '申酉'],
        shen_sha: [],
    },
    life_events: [
        {
            kind: 'liunian',
            ref: '1935',
            ganZhi: '乙亥',
            text: '为避中日战事，搬至上海法租界霞飞路(今淮海路)霞飞坊。',
        },
        {
            kind: 'liunian',
            ref: '1936',
            ganZhi: '丙子',
            text: '迁至上海英租界同孚路(今石门一路)永利坊。小学二年级。',
        },
        {
            kind: 'liunian',
            ref: '1937',
            ganZhi: '丁丑',
            text: '迁至上海同孚路大中里162号2楼。在成都路、南京路口上海小学读四年级。',
        },
        {
            kind: 'liunian',
            ref: '1938',
            ganZhi: '戊寅',
            text: '开始跟随母亲去戈登路（后改爱文义路，现北京西路）刘小姐家「做礼拜」，开始接触基督教。',
        },
        {
            kind: 'liunian',
            ref: '1944',
            ganZhi: '甲申',
            text: '投考上海冠宇中学高一。后转到同德中学。在怀恩堂受戚庆才牧师基督教洗礼。同年由同学李葆华介绍初识佛教。',
        },
        {
            kind: 'liunian',
            ref: '1948',
            ganZhi: '戊子',
            text: '秋天经能海上师接引，皈依佛教，开始修持密宗。首次阅读《大藏经》',
        },
        {
            kind: 'liunian',
            ref: '1949',
            ganZhi: '己丑',
            text: '- 将父亲的一笔款项先后投入拆息和股票市场，因股票崩盘而失败，离家出走，通过马路上的「招征兵役」广告参军(青年军二〇七师)。\n- 5月，乘中兴号邮轮离沪，到达台湾基隆，后转赴新北投。\n- 不足一月，即后悔离家，但因高雄至广州的船票昂贵，回大陆的希望破灭。\n- 9月，再度报名参加国防医学院医护人员招聘。\n- 11月，随部队(五十二军野战医院)赴浙江定海。',
        },
        {
            kind: 'liunian',
            ref: '1950',
            ganZhi: '庚寅',
            text: '在普陀山四个月期间，认识了煮云法师(台湾高雄凤山莲社、台中莲华山创始人)。是年，改名「梁湘润」。',
        },
        {
            kind: 'liunian',
            ref: '1953',
            ganZhi: '癸巳',
            text: '得到上海锦章书局出版的两本命理学著作《渊海子平》、《神峰通考》及《庄子》。',
        },
        {
            kind: 'liunian',
            ref: '1956',
            ganZhi: '丙申',
            text: '得到智光法师的开示：「阴阳五行，与密宗之四大、五方、色彩、大手印有直接关系。」并在智光法师的建议下，开始学习《三命通会》、《栏江网》、《子平真诠》、《滴天髓》 等命理学权威著作。',
        },
        {
            kind: 'liunian',
            ref: '1964',
            ganZhi: '甲辰',
            text: '发表第一本着作《僧宝在哪里》，批评佛教界中的不良现象。',
        },
        {
            kind: 'liunian',
            ref: '1970',
            ganZhi: '庚戌',
            text: '开始私人授业，教授《易经》，方技五行，涵盖「山医命相卜」五术。研究二十五史，尤其重明清史；研究《古今图书集成》、《永乐大典》中的五术类古籍。',
        },
        {
            kind: 'liunian',
            ref: '1972',
            ganZhi: '壬子',
            text: '因缘际会，应邀担任中华星相学会、命理研究委员会主任委员。成立中华星相月刊社，出版《星相月刊》。举办星相学术讲座，担任主讲。',
        },
        {
            kind: 'liunian',
            ref: '1973',
            ganZhi: '癸丑',
            text: '创办东方五术学院。在私人授业同时，开始写作。',
        },
        {
            kind: 'liunian',
            ref: '1974',
            ganZhi: '甲寅',
            text: '出版第一部命理学著作《命学大辞源》。',
        },
        {
            kind: 'liunian',
            ref: '1979',
            ganZhi: '己未',
            text: '9月，与梁天兰女士结为连理。',
        },
        {
            kind: 'liunian',
            ref: '1980',
            ganZhi: '庚申',
            text: '- 与韦千里、邹文耀等两位前辈共同举办为期三个月的子平学教程。\n- 同年夏天，结识影视业巨子向华强先生。同时结识港台二地的一批电影界人士，如刘德华、张敏等。首度开展海外命理风水业务。\n- 10月，儿子出生，取名梁翰。',
        },
        {
            kind: 'liunian',
            ref: '1982',
            ganZhi: '壬戌',
            text: '首度应邀赴美国讲学。自此年开始，每年应邀请赴香港两次讲授命理风水。',
        },
        {
            kind: 'liunian',
            ref: '1991',
            ganZhi: '辛未',
            text: '受聘担任中国道教学院教授。',
        },
        {
            kind: 'liunian',
            ref: '1992',
            ganZhi: '壬申',
            text: '父亲去世，享年93岁。',
        },
        {
            kind: 'liunian',
            ref: '2013',
            ganZhi: '癸巳',
            text: '7月8日因病住院，27日，因肠癌转肝癌不治辞世，享年八十四岁。8月9日，举行大殓，「植葬」于台北富德公墓，回归天地间。',
        },
    ],
};

// 奇门示例正文：提问 / 回答 / 断法。
// 抽成常量是因为三段字段与 dialog_lines 必须完全同源——
// 两处各抄一份，改一处就会让界面读到的正文和列表卡片对不上。
const DEMO_QIMEN_QUESTION = '女性，1970 年人，自身条件挺优越，但就是恋情不顺，婚姻大事一直没有定下来，看看什么时间能嫁人？\n\n我说实话，从我长么大，就今年 5 月看上这一个男的，他当时讲他是2000 年离婚的，现在单身。\n可是，6 月见面时他没有看上我，我忘不了他，可是后来跟他联系，他说自己已经定下女朋友了。\n我感觉他在和我认识之前，就和那女的有眉目了，但我感觉他们肯定会分开，那男的要求很高，那女的只是年轻，素质不高，电话中听出来的，很没水平。\n我对婚姻的态度是非常认真的，我没有游戏成分，会是人家来游戏我吗？这男的也是 70 年的（庚戌）。有个工厂。\n\n喜欢上一个人不容易，我就是想和他成，我还是争取一下吧。\n\n反馈：确实成不了了。那个女人就是这男人的老婆，可能没离婚，替他管理着工厂，女人反而几次骂我是“第三者”，破坏人家婚姻的“妖精”。\n\n反馈：09 年找了一位在此年丧偶的男士，年底前正式结婚的。';

const DEMO_QIMEN_ANSWER = '大伏吟局，定然婚姻不顺。\n\n一是你现在的婚姻中有点“游戏”成分，你处着男朋友吧，这个男朋友很有能力，你很喜欢他，但他现在有婚姻，你们有了矛盾，你为此很烦恼。\n\n和这个人成不了。\n\n如何断以后的婚姻状况呢？';

const DEMO_QIMEN_ANALYSIS = '- 日干丙下临丙，丙为男朋友，丙+丙，因此可以讲她有男朋友，临太阴主没有公开，宫中暗干见丁，丁壬为隐密之合，也断为有男友。\n- 丙火生辛金，丙辛合，对方有婚姻。\n- 日干宫中暗干见丁，表明自己有第三者的嫌疑。\n- 壬丙相遇是非起，又临死门，表明现在有矛盾，求测人心里不高兴。\n- 临马星，心里不踏实。\n- 六合临景门，主游戏。\n- 又日干丙，时干是甲午辛，时干为所问之事，丙辛合，为辛为恋爱对象。\n- 日干丙火生辛金，很喜欢并追求对方。\n- 辛临开门，天心星，值符，是个有能力的人。\n- 但辛在桃花之地，辛下辛，主这件事有错误，也表示这个人有问题，那问题就在于对方现在有婚姻，与她的恋爱只是“桃花”。\n\n（1）既然对方已经有婚姻，则求测人可以用丁来代\n表，庚为男朋友，乙为男朋友的妻子或女友。现在庚生乙，而庚丁处于对冲之地。这表明对方不会分开，不能与她在一起。\n（2）双方的年命都为庚，庚+庚战格兄弟雷攻，意味着会分手。\n（3）时干辛+辛，伏吟天庭，自刑，主追求这个人是错误的选择，这件事有问题。古语：“反伏门迫恐招殃”，婚事不成，凡惹是非之象。\n\n- 大局伏吟，婚姻肯定还会推迟。\n- 07 年太岁丁亥，年命庚金落宫冲克太岁落宫主有灾，不能成婚。\n- 08 年戊子，太岁戊临六合与乙奇对冲，又克年命庚金落宫，难成婚。\n- 09 年己丑落艮宫，生年命庚金落宫，庚又主丈夫，又六合生太岁落宫，09 年成婚。\n\n日干在坤宫伏吟，伏吟以冲为应期，丑年冲宫，也应己丑年成婚。';

/**
 * 奇门示例：1970 女性问婚姻（大伏吟局）。
 *
 * 导出来源是「精简表格」，这里按内部结构还原：中文字段拆回
 * description（提问）/ feedback（回答）/ analysis（断法）。
 * dialog_lines 是界面读的顺序流——没有它，断法挂在哪条回答之后只能靠猜。
 * 时间同样是 2007-10-19 11:17（本地）对应的 UTC 时刻。
 */
export const DEMO_QIMEN_CASE: CreateQimenCaseInput = {
    title: '【示例】1970女性问婚姻',
    test_date: '2007-10-19T03:17:00.000Z',
    category: 'love',
    description: DEMO_QIMEN_QUESTION,
    feedback: DEMO_QIMEN_ANSWER,
    analysis: DEMO_QIMEN_ANALYSIS,
    dialog_lines: [
        { kind: 'q', text: DEMO_QIMEN_QUESTION },
        { kind: 'a', text: DEMO_QIMEN_ANSWER },
        { kind: 'r', text: DEMO_QIMEN_ANALYSIS },
    ],
};

/** 投放标记：写过一次就不再写，用户删掉示例也不会被塞回来 */
const DEMO_SEEDED_KEY = 'demo_cases_seeded';

/**
 * 首次启动投放示例案例。幂等：
 * - 已有标记 → 直接返回，不再碰库（用户删掉示例是明确意图，不能自动复活）
 * - 首次 → 用固定 id 直接写底层存储，绕开 createCase 的随机 id
 */
export async function seedDemoCases(): Promise<void> {
    if (readSetting<boolean>(DEMO_SEEDED_KEY, false)) return;

    const timestamp = new Date().toISOString();
    await localPrivateStore.put(
        'bazi_case',
        { ...DEMO_BAZI_CASE, created_at: timestamp, updated_at: timestamp },
        DEMO_BAZI_CASE_ID,
    );
    await localPrivateStore.put(
        'qimen_case',
        { ...DEMO_QIMEN_CASE, created_at: timestamp, updated_at: timestamp },
        DEMO_QIMEN_CASE_ID,
    );

    writeSetting(DEMO_SEEDED_KEY, true);
}
