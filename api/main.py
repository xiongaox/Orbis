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

# 五行映射
GAN_ELEMENT_MAP = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
}

ZHI_ELEMENT_MAP = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
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


@app.get("/api/bazi")
def get_bazi(
    year: int = Query(..., description="公历年"),
    month: int = Query(..., description="公历月"),
    day: int = Query(..., description="公历日"),
    hour: int = Query(..., description="时（0-23）"),
    minute: int = Query(0, description="分（0-59）"),
    gender: int = Query(1, description="性别：1=男，0=女"),
):
    """
    获取八字数据
    
    返回完整的八字信息，包括：
    - 四柱干支、藏干、十神、长生、纳音、空亡
    - 起运时间
    - 大运列表（含流年、小运）
    """
    # 1. 创建公历和阴历对象
    solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
    lunar = solar.getLunar()
    bazi = lunar.getEightChar()
    
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
    
    # 5. 获取当前大运周期的流年和小运（第二个大运，即起大运后第一轮）
    current_liunian = []
    current_xiaoyun = []
    dayun_arr = yun.getDaYun()
    if len(dayun_arr) > 1:
        current_liunian = build_liunian_list(dayun_arr[1])
        current_xiaoyun = build_xiaoyun_list(dayun_arr[1])
    
    # 6. 获取所有大运的流年和小运
    all_liunian = []
    all_xiaoyun = []
    for i, dayun in enumerate(dayun_arr):
        if i == 0:  # 跳过出生年
            continue
        # 流年
        liunian_list = build_liunian_list(dayun)
        for ln in liunian_list:
            ln['dayunIndex'] = i
        all_liunian.extend(liunian_list)
        
        # 小运
        try:
            xiaoyun_list = build_xiaoyun_list(dayun)
            for xy in xiaoyun_list:
                xy['dayunIndex'] = i
            all_xiaoyun.extend(xiaoyun_list)
        except Exception:
            pass  # 某些大运可能没有小运数据
    
    # 7. 获取神煞信息（吉神、凶煞）
    shen_sha = {
        'jiShen': list(lunar.getDayJiShen()),   # 吉神
        'xiongSha': list(lunar.getDayXiongSha()),  # 凶煞
    }
    
    # 8. 构建返回数据
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
        }
    }


@app.get("/api/health")
def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "八字 API 运行正常"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
