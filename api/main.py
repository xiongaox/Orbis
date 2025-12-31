"""
八字排盘 API - 使用 lunar-python 进行八字计算
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from lunar_python import Solar

app = FastAPI(title="八字排盘 API", version="1.0.0")

# 配置 CORS（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 十神表 (DayGan -> TargetGan -> ShiShen)
SHI_SHEN_MAP = {
    '甲': {'甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '偏印', '癸': '正印'},
    '乙': {'甲': '劫财', '乙': '比肩', '丙': '伤官', '丁': '食神', '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀', '壬': '正印', '癸': '偏印'},
    '丙': {'甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫财', '戊': '食神', '己': '伤官', '庚': '偏财', '辛': '正财', '壬': '七杀', '癸': '正官'},
    '丁': {'甲': '正印', '乙': '偏印', '丙': '劫财', '丁': '比肩', '戊': '伤官', '己': '食神', '庚': '正财', '辛': '偏财', '壬': '正官', '癸': '七杀'},
    '戊': {'甲': '七杀', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫财', '庚': '食神', '辛': '伤官', '壬': '偏财', '癸': '正财'},
    '己': {'甲': '正官', '乙': '七杀', '丙': '正印', '丁': '偏印', '戊': '劫财', '己': '比肩', '庚': '伤官', '辛': '食神', '壬': '正财', '癸': '偏财'},
    '庚': {'甲': '偏财', '乙': '正财', '丙': '七杀', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫财', '壬': '食神', '癸': '伤官'},
    '辛': {'甲': '正财', '乙': '偏财', '丙': '正官', '丁': '七杀', '戊': '正印', '己': '偏印', '庚': '劫财', '辛': '比肩', '壬': '伤官', '癸': '食神'},
    '壬': {'甲': '食神', '乙': '伤官', '丙': '偏财', '丁': '正财', '戊': '七杀', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫财'},
    '癸': {'甲': '伤官', '乙': '食神', '丙': '正财', '丁': '偏财', '戊': '正官', '己': '七杀', '庚': '正印', '辛': '偏印', '壬': '劫财', '癸': '比肩'},
}

# 藏干表 (Zhi -> [Gan...])
ZANG_GAN_MAP = {
    '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
    '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
}

# 纳音表
NA_YIN_MAP = {
    '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火', '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土', '壬申': '剑锋金', '癸酉': '剑锋金',
    '甲戌': '山头火', '乙亥': '山头火', '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土', '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
    '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土', '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木', '壬辰': '长流水', '癸巳': '长流水',
    '甲午': '砂中金', '乙未': '砂中金', '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木', '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
    '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水', '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金', '壬子': '桑柘木', '癸丑': '桑柘木',
    '甲寅': '大溪水', '乙卯': '大溪水', '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火', '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
}

# 十二长生 (DayGan -> Zhi -> State)
CHANG_SHENG_MAP = {
    '甲': {'亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官', '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死', '未': '墓', '申': '绝', '酉': '胎', '戌': '养'},
    '乙': {'午': '长生', '巳': '沐浴', '辰': '冠带', '卯': '临官', '寅': '帝旺', '丑': '衰', '子': '病', '亥': '死', '戌': '墓', '酉': '绝', '申': '胎', '未': '养'},
    '丙': {'寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养'},
    '丁': {'酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养'},
    '戊': {'寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养'},
    '己': {'酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养'},
    '庚': {'巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官', '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死', '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养'},
    '辛': {'子': '长生', '亥': '沐浴', '戌': '冠带', '酉': '临官', '申': '帝旺', '未': '衰', '午': '病', '巳': '死', '辰': '墓', '卯': '绝', '寅': '胎', '丑': '养'},
    '壬': {'申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官', '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死', '辰': '墓', '巳': '绝', '午': '胎', '未': '养'},
    '癸': {'卯': '长生', '寅': '沐浴', '丑': '冠带', '子': '临官', '亥': '帝旺', '戌': '衰', '酉': '病', '申': '死', '未': '墓', '午': '绝', '巳': '胎', '辰': '养'},
}



# 五行映射
GAN_ELEMENT_MAP = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth',
    '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water'
}
ZHI_ELEMENT_MAP = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth',
    '巳': 'fire', '午': 'fire', '未': 'earth', '申': 'metal', '酉': 'metal',
    '戌': 'earth', '亥': 'water'
}


def get_element(char: str) -> str:
    """获取干支对应的五行"""
    return GAN_ELEMENT_MAP.get(char) or ZHI_ELEMENT_MAP.get(char, '')


def build_pillar(bazi, pillar_type: str) -> dict:
    """
    构建单柱数据
    pillar_type: 'year', 'month', 'day', 'time'
    """
    label_map = {'year': '年柱', 'month': '月柱', 'day': '日柱', 'time': '时柱'}
    
    # 获取各类方法
    get_pillar = getattr(bazi, f'get{pillar_type.capitalize()}')
    get_gan = getattr(bazi, f'get{pillar_type.capitalize()}Gan')
    get_zhi = getattr(bazi, f'get{pillar_type.capitalize()}Zhi')
    get_hide_gan = getattr(bazi, f'get{pillar_type.capitalize()}HideGan')
    get_shi_shen_gan = getattr(bazi, f'get{pillar_type.capitalize()}ShiShenGan')
    get_shi_shen_zhi = getattr(bazi, f'get{pillar_type.capitalize()}ShiShenZhi')
    get_di_shi = getattr(bazi, f'get{pillar_type.capitalize()}DiShi')
    get_na_yin = getattr(bazi, f'get{pillar_type.capitalize()}NaYin')
    get_xun_kong = getattr(bazi, f'get{pillar_type.capitalize()}XunKong')
    
    tiangan = get_gan()
    dizhi = get_zhi()
    hide_gan_list = get_hide_gan()
    shi_shen_zhi_list = get_shi_shen_zhi()
    
    # 构建藏干数据
    zanggan = []
    for i, gan in enumerate(hide_gan_list):
        shi_shen = shi_shen_zhi_list[i] if i < len(shi_shen_zhi_list) else ''
        zanggan.append({
            'gan': gan,
            'shiShen': shi_shen,
            'element': get_element(gan)
        })
    
    return {
        'label': label_map[pillar_type],
        'ganZhi': get_pillar(),
        'tiangan': tiangan,
        'dizhi': dizhi,
        'tianganElement': get_element(tiangan),
        'dizhiElement': get_element(dizhi),
        'tianganShiShen': get_shi_shen_gan(),
        'dizhiShiShen': list(shi_shen_zhi_list),
        'zanggan': zanggan,
        'diShi': get_di_shi(),
        'naYin': get_na_yin(),
        'kongWang': get_xun_kong(),
    }


def build_dayun_list(yun) -> list:
    """构建大运列表，确保返回10个正式大运（不含index=0的出生年）"""
    dayun_arr = yun.getDaYun()
    result = []
    
    # 天干地支列表用于手动计算额外大运
    gan_list = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    zhi_list = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    
    for dayun in dayun_arr:
        gan_zhi = dayun.getGanZhi()
        tiangan = gan_zhi[0] if gan_zhi else ''
        dizhi = gan_zhi[1] if len(gan_zhi) > 1 else ''
        
        result.append({
            'index': dayun.getIndex(),
            'startYear': dayun.getStartYear(),
            'endYear': dayun.getEndYear(),
            'startAge': dayun.getStartAge(),
            'endAge': dayun.getEndAge(),
            'ganZhi': gan_zhi,
            'tiangan': tiangan,
            'dizhi': dizhi,
            'xunKong': dayun.getXunKong() if hasattr(dayun, 'getXunKong') else '',
        })
    
    # 计算额外的大运直到有11个（1个出生年 + 10个正式大运）
    while len(result) < 11:
        last = result[-1]
        last_idx = last['index']
        last_gan = last['tiangan']
        last_zhi = last['dizhi']
        
        # 根据顺行/逆行方向计算下一个大运
        is_forward = yun.isForward()
        if last_gan and last_zhi:
            gan_idx = gan_list.index(last_gan)
            zhi_idx = zhi_list.index(last_zhi)
            
            if is_forward:
                next_gan = gan_list[(gan_idx + 1) % 10]
                next_zhi = zhi_list[(zhi_idx + 1) % 12]
            else:
                next_gan = gan_list[(gan_idx - 1) % 10]
                next_zhi = zhi_list[(zhi_idx - 1) % 12]
            
            next_ganzhi = next_gan + next_zhi
        else:
            next_gan = ''
            next_zhi = ''
            next_ganzhi = ''
        
        result.append({
            'index': last_idx + 1,
            'startYear': last['endYear'] + 1,
            'endYear': last['endYear'] + 10,
            'startAge': last['endAge'] + 1,
            'endAge': last['endAge'] + 10,
            'ganZhi': next_ganzhi,
            'tiangan': next_gan,
            'dizhi': next_zhi,
            'xunKong': '',
        })
    
    return result


def build_liunian_list(dayun) -> list:
    """构建某个大运周期内的流年列表（含流月）"""
    liunian_arr = dayun.getLiuNian()
    result = []
    
    for liunian in liunian_arr:
        gan_zhi = liunian.getGanZhi()
        tiangan = gan_zhi[0] if gan_zhi else ''
        dizhi = gan_zhi[1] if len(gan_zhi) > 1 else ''
        
        # 获取流月
        liuyue_list = []
        try:
            liuyue_arr = liunian.getLiuYue()
            for liuyue in liuyue_arr:
                ly_ganzhi = liuyue.getGanZhi()
                liuyue_list.append({
                    'month': liuyue.getMonthInChinese(),
                    'index': liuyue.getIndex(),
                    'ganZhi': ly_ganzhi,
                    'tiangan': ly_ganzhi[0] if ly_ganzhi else '',
                    'dizhi': ly_ganzhi[1] if len(ly_ganzhi) > 1 else '',
                })
        except Exception:
            pass
        
        result.append({
            'year': liunian.getYear(),
            'age': liunian.getAge(),
            'ganZhi': gan_zhi,
            'tiangan': tiangan,
            'dizhi': dizhi,
            'liuYue': liuyue_list,  # 流月列表
        })
    
    return result


def build_xiaoyun_list(dayun) -> list:
    """构建某个大运周期内的小运列表"""
    xiaoyun_arr = dayun.getXiaoYun()
    result = []
    
    for xiaoyun in xiaoyun_arr:
        gan_zhi = xiaoyun.getGanZhi()
        
        result.append({
            'year': xiaoyun.getYear(),
            'age': xiaoyun.getAge(),
            'ganZhi': gan_zhi,
        })
    
    return result


def get_xunkong(gan_zhi: str) -> str:
    """计算空亡"""
    if not gan_zhi or len(gan_zhi) < 2: return ''
    # 简易计算：天干数 (甲1...癸10) - 地支数 (子1...亥12)
    gan = gan_zhi[0]
    zhi = gan_zhi[1]
    
    gan_list = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    zhi_list = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    
    if gan not in gan_list or zhi not in zhi_list: return ''
    
    gan_idx = gan_list.index(gan) + 1
    zhi_idx = zhi_list.index(zhi) + 1
    
    # 旬空口诀对应：
    # 甲子旬(1-1=0) -> 戌亥(11,12)
    # 甲戌旬(1-11=-10->2) -> 申酉(9,10)
    # 甲申旬(1-9=-8->4) -> 午未(7,8)
    # 甲午旬(1-7=-6->6) -> 辰巳(5,6)
    # 甲辰旬(1-5=-4->8) -> 寅卯(3,4)
    # 甲寅旬(1-3=-2->10) -> 子丑(1,2)
    
    diff = gan_idx - zhi_idx
    if diff <= 0:
        diff += 12
        
    lookup = {
        12: '戌亥', # diff=0 (e.g. 1-1=0 -> +12)
        10: '子丑',
        8: '寅卯',
        6: '辰巳',
        4: '午未',
        2: '申酉'
    }
    return lookup.get(diff, '')

def build_dynamic_pillar_details(label: str, gan_zhi: str, day_gan: str, yun_index: int = None) -> dict:
    """构建动态柱（大运/流年）的详细信息"""
    if not gan_zhi or len(gan_zhi) < 2:
        return {}
        
    gan = gan_zhi[0]
    zhi = gan_zhi[1]
    
    # 1. 主星 (天干十神)
    tiangan_shishen = SHI_SHEN_MAP.get(day_gan, {}).get(gan, '')
    
    # 2. 藏干详情
    hide_gans = ZANG_GAN_MAP.get(zhi, [])
    zanggan = []
    for h_gan in hide_gans:
        zanggan.append({
            'gan': h_gan,
            'shiShen': SHI_SHEN_MAP.get(day_gan, {}).get(h_gan, ''),
            'element': get_element(h_gan)
        })
        
    # 3. 星运 (十二长生) - 视同"自坐" (Self-Sitting)
    xing_yun = CHANG_SHENG_MAP.get(day_gan, {}).get(zhi, '') # Day Master vs Branch
    zi_zuo = CHANG_SHENG_MAP.get(gan, {}).get(zhi, '') # Pillar Stem vs Branch
    
    # 4. 纳音
    na_yin = NA_YIN_MAP.get(gan_zhi, '')
    
    # 5. 空亡
    kong_wang = get_xunkong(gan_zhi)
    
    return {
        'label': label,
        'ganZhi': gan_zhi,
        'tiangan': gan,
        'dizhi': zhi,
        'tianganElement': get_element(gan),
        'dizhiElement': get_element(zhi),
        'tianganShiShen': tiangan_shishen,
        'zanggan': zanggan,
        'diShi': xing_yun,  # 星运
        'ziZuo': zi_zuo,    # 自坐
        'naYin': na_yin,
        'kongWang': kong_wang,
        'index': yun_index
    }

@app.get("/api/bazi")
def get_bazi(
    year: int = Query(..., description="公历年"),
    month: int = Query(..., description="公历月"),
    day: int = Query(..., description="公历日"),
    hour: int = Query(..., description="时（0-23）"),
    minute: int = Query(0, description="分（0-59）"),
    gender: int = Query(1, description="性别：1=男，0=女"),
    currentYear: int = Query(None, description="查看的流年年份（默认当前年）"),
):
    """
    获取八字数据
    """
    if currentYear is None:
        import datetime
        currentYear = datetime.datetime.now().year

    # 1. 创建公历和阴历对象
    solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
    lunar = solar.getLunar()
    bazi = lunar.getEightChar()
    day_gan = bazi.getDayGan()
    
    # 2. 构建四柱数据
    pillars = [
        build_pillar(bazi, 'year'),
        build_pillar(bazi, 'month'),
        build_pillar(bazi, 'day'),
        build_pillar(bazi, 'time'),
    ]
    
    # 3. 获取起运信息
    yun = bazi.getYun(gender)
    start_solar = yun.getStartSolar()
    
    yun_info = {
        'startYear': yun.getStartYear(),
        'startMonth': yun.getStartMonth(),
        'startDay': yun.getStartDay(),
        'startHour': yun.getStartHour() if hasattr(yun, 'getStartHour') else 0,
        'startSolarDate': f"{start_solar.getYear()}年{start_solar.getMonth()}月{start_solar.getDay()}日",
        'isForward': yun.isForward(),  # 是否顺行
    }
    
    # 4. 获取大运列表
    dayun_list = build_dayun_list(yun)
    
    # 5. 确定当前大运
    current_dayun_data = None
    
    # 查找包含 currentYear 的大运
    active_da_yun = None
    for dy in dayun_list:
        if dy['startYear'] <= currentYear <= dy['endYear']:
            active_da_yun = dy
            break
            
    # 如果没找到（比如在起运前），可能使用第一个大运（即出生后的童限或index=1）
    if not active_da_yun and dayun_list:
        active_da_yun = dayun_list[0]
        
    if active_da_yun:
        current_dayun_data = build_dynamic_pillar_details(
            '大运', 
            active_da_yun['ganZhi'], 
            day_gan, 
            active_da_yun['index']
        )
    
    # 6. 确定当前流年
    current_liunian_ganzhi = ''
    try:
         # 利用 Solar 转 Lunar 获取指定年份的干支
         tmp_solar = Solar.fromYmdHms(currentYear, 6, 15, 12, 0, 0) # Mid-year
         tmp_lunar = tmp_solar.getLunar()
         current_liunian_ganzhi = tmp_lunar.getYearInGanZhi()
    except:
        pass
        
    current_liunian_data = build_dynamic_pillar_details(
        '流年',
        current_liunian_ganzhi,
        day_gan
    )
    
    # 7. 获取神煞信息（吉神、凶煞）
    shen_sha = {
        'jiShen': list(lunar.getDayJiShen()),   # 吉神
        'xiongSha': list(lunar.getDayXiongSha()),  # 凶煞
    }
    
    # (保留旧的列表逻辑用于向下兼容或列表展示，但主要依赖 dynamic pillars)
    all_liunian = []
    all_xiaoyun = []
    
    # Generate full lists
    dayun_arr = yun.getDaYun()
    for i, dayun in enumerate(dayun_arr):
        if i == 0: continue
        liunian_list = build_liunian_list(dayun)
        for ln in liunian_list: ln['dayunIndex'] = i
        all_liunian.extend(liunian_list)
        try:
            xiaoyun_list = build_xiaoyun_list(dayun)
            for xy in xiaoyun_list: xy['dayunIndex'] = i
            all_xiaoyun.extend(xiaoyun_list)
        except: pass

    # 返回数据
    return {
        # 日期信息
        'solarDate': f"{solar.getYear()}年{solar.getMonth()}月{solar.getDay()}日 {solar.getHour():02d}:{solar.getMinute():02d}",
        'lunarDate': f"{lunar.getYearInGanZhi()}年{lunar.getMonthInChinese()}月{lunar.getDayInChinese()} {lunar.getTimeZhi()}时",
        'zodiac': lunar.getYearShengXiao(),
        'gender': '乾造' if gender == 1 else '坤造',
        
        # 四柱
        'pillars': pillars,
        
        # 起运信息
        'yunInfo': yun_info,
        
        # 大运列表
        'daYun': dayun_list,
        
        # 流年（所有大运周期）
        'liuNian': all_liunian,
        
        # 小运（所有大运周期）
        'currentXiaoYun': all_xiaoyun,
        
        # 神煞
        'shenSha': shen_sha,
        
        # 额外信息
        'extra': {
            'taiYuan': bazi.getTaiYuan(),  # 胎元
            'mingGong': bazi.getMingGong(),  # 命宫
            'shenGong': bazi.getShenGong(),  # 身宫
        },
        
        # 新增详细字段
        'currentDaYun': current_dayun_data,
        'currentLiuNian': current_liunian_data,
    }



@app.get("/api/health")
def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "八字 API 运行正常"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
