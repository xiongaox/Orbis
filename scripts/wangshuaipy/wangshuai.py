import sys
import json
import math
import copy

# =========================================================================
# 0. Standalone Bazi Logic (No External Deps)
# =========================================================================
USE_LITE = False
try:
    from lunar_python import Solar, Lunar, LunarYear, LunarMonth, EightChar
except ImportError:
    USE_LITE = True
    # print("⚠️ 缺少依赖库 'lunar_python'，切换至简易排盘内核 (Lite Mode)")

if USE_LITE:
    import datetime

    class SimpleBazi:
        """
        Simplified Bazi Calculator (1900-2100)
        Approximate Solar Terms for standalone execution.
        """
        def __init__(self, y, m, d, h, minute, gender):
            self.y = y
            self.m = m
            self.d = d
            self.h = h
            self.gender = gender # 1 male, 0 female
            
            self.tg = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
            self.dz = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
            
        def get_gan_zhi(self, offset):
            return self.tg[offset % 10] + self.dz[offset % 12]

        def get_year_gan_zhi_idx(self):
            # Approx Li Chun around Feb 4
            # If date < Feb 4, use prev year
            y_calc = self.y
            if self.m < 2 or (self.m == 2 and self.d < 4):
                y_calc -= 1
            return (y_calc - 4) % 60
            
        def get_month_gan_zhi_idx(self, year_gan_idx):
            # JieQi Table (Approximate Days)
            # Jan 5, Feb 4, Mar 6, Apr 5, May 6, Jun 6, Jul 7, Aug 8, Sep 8, Oct 8, Nov 7, Dec 7
            jq_days = [5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7]
            
            y_calc = self.y
            if self.m < 2 or (self.m == 2 and self.d < 4): # Before Li Chun convention
                 # In Bazi year logic, if before Li Chun, it's prev year's last month (Chou) or similar
                 # But standard calculation:
                 pass
            
            # Month Index based on Solar Terms
            # Feb 4 (Li Chun) -> Yin Month (Index 2)
            # Find current solar month index (0=Yin, 1=Mao...)
            
            # Simple offset:
            # If M=2, D>=4 -> Yin (0)
            # If M=3, D>=6 -> Mao (1)
            # ...
            
            base_m_idx = self.m - 1 # 0=Jan, 11=Dec
            limit = jq_days[base_m_idx]
            
            is_after_jq = self.d >= limit
            
            # Standard astrological months:
            # Jan 5 - Feb 3: Chou (11)
            # Feb 4 - Mar 5: Yin (0)
            # ...
            # Dec 7 - Jan 4: Zi (10)
            
            # Map valid months relative into year
            # 0: Yin, 1: Mao, ... 11: Chou
            
            # Logic:
            # Feb (1): D>=4 -> 0, else -> 11 (of prev year basically)
            # Mar (2): D>=6 -> 1, else -> 0
            
            m_offsets = {
                1: (4, 0, 11), # Feb: >=4 -> Yin(0), else Chou(11)
                2: (6, 1, 0),  # Mar: >=6 -> Mao(1), else Yin(0)
                3: (5, 2, 1),
                4: (6, 3, 2),
                5: (6, 4, 3),
                6: (7, 5, 4),
                7: (8, 6, 5),
                8: (8, 7, 6),
                9: (8, 8, 7),
                10: (7, 9, 8),
                11: (7, 10, 9),
                0: (6, 11, 10) # Jan: >=6 -> Chou(11), else Zi(10)
            }
            
            limit, cur, prev = m_offsets[self.m - 1]
            month_branch_idx = cur if self.d >= limit else prev
            
            # Adjust year stem for month calculation
            year_stem_idx = year_gan_idx % 10
            # Nian Shang Qi Yue: 甲己之年丙作首...
            # 甲(0)己(5) -> 丙(2)
            # 乙(1)庚(6) -> 戊(4)
            # 丙(2)辛(7) -> 庚(6)
            # 丁(3)壬(8) -> 壬(8)
            # 戊(4)癸(9) -> 甲(0)
            
            start_stem = (year_stem_idx % 5) * 2 + 2
            month_stem_idx = (start_stem + month_branch_idx) % 10
            
            # Month Branch in cycle (Yin=2)
            # But the GanZhi combination needs correct offset
            # Yin(2), Mao(3)...
            true_branch_idx = (month_branch_idx + 2) % 12
            
            # Calculate offset in 60 cycle
            # We have stem and branch. Find index.
            # (Stem - Branch) % 12 / 2 * 10 + Stem? No.
            # Simple lookup or match
            
            return (month_stem_idx, true_branch_idx)

        def get_day_gan_zhi_idx(self):
            # Anchor: 1900-01-01 was Jia Xu (Index 10: 甲10 戌10? No. 甲 is 0. 戌 is 10.)
            # Wait, verify 1900-01-01
            # 1900-01-31 is Lunar New Year.
            # Using datetime to get days delta from a known point.
            # 2000-01-01 was Wu Wu (Stem 4, Branch 6). Index 54?
            
            # Known: 2000-01-01 = Wu Wu.
            # Wu (4) Wu (6). 
            # 4-6 = -2. (10 + -2)%12 = 8. -> 50?
            # 54: Wu(4) Xu(10). No.
            # Let's check Wu Wu index.
            # 0: Jia Zi. ... 57: Xin You. ...
            # Wu Wu is 54? 
            # 甲子0 ... 戊午 ?
            # (St - Br) = (4-6) = -2. 10/2 = 5.
            # Formula: Let S=Stem, B=Branch.
            # if S%2 != B%2 return Error (impossible)
            # idx = (S - B) % 12 * 5 + S (approx formula often used, let's verify)
            # Jia(0) Zi(0) -> 0. Correct.
            # Jia(0) Xu(10) -> -10%12=2. 2*5=10. + 0 = 10. Correct.
            # Wu(4) Wu(6) -> -2%12=10. 10*5=50. + 4 = 54. Correct.
            
            base = datetime.date(2000, 1, 1) # Wu Wu (54)
            curr = datetime.date(self.y, self.m, self.d)
            delta = (curr - base).days
            
            return (54 + delta) % 60

        def get_hour_gan_zhi_idx(self, day_stem_idx):
            # Zi: 23-1, Chou: 1-3...
            # h + 1 // 2 gives branch index?
            # 23 (11pm) -> (23+1)//2 = 12 -> 0 (Zi)
            # 0 (12am) -> (0+1)//2 = 0 (Zi)
            # 1 (1am) -> (1+1)//2 = 1 (Chou)
            branch_idx = ((self.h + 1) % 24) // 2
            
            # Ri Shang Qi Shi:
            # 甲己还加甲...
            # Start stem based on Day Stem
            start_stem = (day_stem_idx % 5) * 2
            stem_idx = (start_stem + branch_idx) % 10
            
            return (stem_idx, branch_idx)

        def get_output(self):
            # Year
            y_gz_idx = self.get_year_gan_zhi_idx()
            y_gz = self.get_gan_zhi(y_gz_idx)
            
            # Month
            m_s, m_b = self.get_month_gan_zhi_idx(y_gz_idx)
            m_gz = self.tg[m_s] + self.dz[m_b]
            
            # Day
            d_gz_idx = self.get_day_gan_zhi_idx()
            d_stem_idx = d_gz_idx % 10 # Stem index
            d_gz = self.get_gan_zhi(d_gz_idx)
            
            # Hour
            h_s, h_b = self.get_hour_gan_zhi_idx(d_stem_idx)
            h_gz = self.tg[h_s] + self.dz[h_b]
            
            pillars = [
                {'tiangan': y_gz[0], 'dizhi': y_gz[1]},
                {'tiangan': m_gz[0], 'dizhi': m_gz[1]},
                {'tiangan': d_gz[0], 'dizhi': d_gz[1]},
                {'tiangan': h_gz[0], 'dizhi': h_gz[1]}
            ]
            
            # Da Yun (Lite - Blind Layout)
            # Cannot calculate precise Start Year easily without JieQi exact minutes
            # Just output flow
            da_yun_list = []
            
            start_stem_idx = m_s
            start_branch_idx = m_b
            
            y_stem_yinyang = TIAN_GAN_YIN_YANG[y_gz[0]]
            is_male = (self.gender == 1)
            is_forward = (is_male and y_stem_yinyang == '阳') or (not is_male and y_stem_yinyang == '阴')
            
            for i in range(8):
                if is_forward:
                    start_stem_idx = (start_stem_idx + 1) % 10
                    start_branch_idx = (start_branch_idx + 1) % 12
                else:
                    start_stem_idx = (start_stem_idx - 1 + 10) % 10
                    start_branch_idx = (start_branch_idx - 1 + 12) % 12
                da_yun_list.append(self.tg[start_stem_idx] + self.dz[start_branch_idx])
                
            return pillars, da_yun_list


# =========================================================================
# 1. 基础常量 (Constants)
# =========================================================================

TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
WU_XING = ['木', '火', '土', '金', '水']

TIAN_GAN_WU_XING = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}

DI_ZHI_WU_XING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

DI_ZHI_CANG_GAN = {
    '子': ['癸'],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙'],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '庚', '戊'],
    '午': ['丁', '己'],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛'],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲'],
}

LU_MAP = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
}
REN_MAP = {
    '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
    '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥'
}

DIRECTION_MAP = {
    '木': '东方', '火': '南方', '土': '西南、东北', '金': '西方', '水': '北方'
}

CONTROLLING = {
    '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
}

WET_EARTH = ['辰', '丑']
DRY_EARTH = ['戌', '未']

TIAN_GAN_YIN_YANG = {
    '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
    '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
}

RAW_HIDDEN_STEMS = {
    '子': { '癸': 30 }, '丑': { '己': 18, '癸': 9, '辛': 3 },
    '寅': { '甲': 18, '丙': 9, '戊': 3 }, '卯': { '乙': 30 },
    '辰': { '戊': 18, '乙': 9, '癸': 3 }, '巳': { '丙': 18, '戊': 9, '庚': 3 },
    '午': { '丁': 20, '己': 10 }, '未': { '己': 18, '丁': 9, '乙': 3 },
    '申': { '庚': 18, '壬': 9, '戊': 3 }, '酉': { '辛': 30 },
    '戌': { '戊': 18, '辛': 9, '丁': 3 }, '亥': { '壬': 18, '甲': 12 }
}

# =========================================================================
# 2. 静态数据与辅助 (Static Data & Helpers)
# =========================================================================

class StemInfo:
    def __init__(self, el, pol):
        self.el = el
        self.pol = pol

STEMS_INFO = {
    '甲': StemInfo('木', '+'), '乙': StemInfo('木', '-'),
    '丙': StemInfo('火', '+'), '丁': StemInfo('火', '-'),
    '戊': StemInfo('土', '+'), '己': StemInfo('土', '-'),
    '庚': StemInfo('金', '+'), '辛': StemInfo('金', '-'),
    '壬': StemInfo('水', '+'), '癸': StemInfo('水', '-')
}

ELEMENT_MAP = {}
for k, v in TIAN_GAN_WU_XING.items():
    ELEMENT_MAP[k] = v
for k, v in DI_ZHI_WU_XING.items():
    ELEMENT_MAP[k] = v

WU_XING_LIST = ['木', '火', '土', '金', '水']

TRANSFORM_RULES = [
    ({'甲', '己'}, '土', ['辰', '戌', '丑', '未', '巳', '午'], ['木'], ['金', '火']),
    ({'乙', '庚'}, '金', ['申', '酉', '巳'], ['火'], ['水', '土']),
    ({'丙', '辛'}, '水', ['申', '酉'], ['土'], ['木', '金']),
    ({'丁', '壬'}, '木', ['寅', '卯'], ['金'], ['火', '水']),
    ({'戊', '癸'}, '火', ['巳', '午', '寅', '卯', '戌'], ['水'], ['土', '木'])
]

def get_element(char):
    return ELEMENT_MAP.get(char)

def get_ten_god(target_stem, dm_stem_val):
    if dm_stem_val not in STEMS_INFO or target_stem not in STEMS_INFO:
        return "未知"
    
    dm = STEMS_INFO[dm_stem_val]
    tg = STEMS_INFO[target_stem]
    
    dm_idx = WU_XING_LIST.index(dm.el)
    tg_idx = WU_XING_LIST.index(tg.el)
    
    diff = (tg_idx - dm_idx + 5) % 5
    is_same_polarity = (dm.pol == tg.pol)
    
    if diff == 0: return '比肩' if is_same_polarity else '劫财'
    if diff == 1: return '食神' if is_same_polarity else '伤官'
    if diff == 2: return '偏财' if is_same_polarity else '正财'
    if diff == 3: return '七杀' if is_same_polarity else '正官'
    if diff == 4: return '偏印' if is_same_polarity else '正印'
    return "未知"

class WangShuaiResult:
    def __init__(self):
        self.bazi = ""
        self.formal_pattern = ""
        self.body_strength = ""
        self.verdict = ""
        self.calc_pattern = ""
        self.physics_log = []
        self.joy_gods = []
        self.ji_gods = []
        self.lucky_directions = []
        self.z_score = 0
        self.formation_check = ""
        self.day_kong_wang = []
        self.pattern_code = ""

# =========================================================================
# 3. 核心计算函数 (Core Calculation)
# =========================================================================

def calculate_wang_shuai(pillars):
    """
    pillars: List[Dict] -> [{'tiangan': '甲', 'dizhi': '子'}, ...]
    """
    """
    pillars: List[Dict] -> [{'tiangan': '甲', 'dizhi': '子'}, ...]
    """
    res = WangShuaiResult()
    
    if not pillars or len(pillars) < 4:
        res.bazi = "无效数据"
        res.formal_pattern = "数据不全"
        res.verdict = "未知"
        return res

    stems = [p['tiangan'] for p in pillars]
    branches = [p['dizhi'] for p in pillars]
    dm_stem = stems[2] # 日主
    month_branch = branches[1]
    
    if dm_stem not in STEMS_INFO:
        return res

    dm_info = STEMS_INFO[dm_stem]
    dm_el = dm_info.el
    
    # 辅助变量
    has_water_stem = '壬' in stems or '癸' in stems
    has_wood_stem = '甲' in stems or '乙' in stems
    has_fire_stem = '丙' in stems or '丁' in stems
    has_metal_stem = '庚' in stems or '辛' in stems
    
    res.bazi = ' '.join([p['tiangan'] + p['dizhi'] for p in pillars])
    
    # -------------------------------------------------------------------------
    # 3. 严谨定格 (Strict Pattern)
    # -------------------------------------------------------------------------
    def determine_strict_pattern():
        hidden = DI_ZHI_CANG_GAN.get(month_branch, [])
        if not hidden: return "未知"
        
        main_qi = hidden[0]
        
        if LU_MAP.get(dm_stem) == month_branch: return "建禄格 (月令建禄)"
        if REN_MAP.get(dm_stem) == month_branch: return "羊刃格 (月令帝旺)"
        
        all_visible_stems = [stems[0], stems[1], stems[3]]
        
        # 本气透干
        if main_qi in all_visible_stems:
            god = get_ten_god(main_qi, dm_stem)
            if god not in ['比肩', '劫财']: return f"{god}格 (本气透干)"
            
        # 杂气透干
        for i in range(1, len(hidden)):
            sub_qi = hidden[i]
            if sub_qi in all_visible_stems:
                god = get_ten_god(sub_qi, dm_stem)
                if god not in ['比肩', '劫财']: return f"{god}格 (杂气透干)"
                
        return "不成格 (月令藏干均未透)"
        
    res.formal_pattern = determine_strict_pattern()
    
    # -------------------------------------------------------------------------
    # 4. 物理引擎全集
    # -------------------------------------------------------------------------
    import copy
    hidden_stems = copy.deepcopy(RAW_HIDDEN_STEMS)
    physics_log = []
    
    all_chars = stems + branches
    counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
    for char in all_chars:
        el = get_element(char)
        if el: counts[el] += 1
        
    forced_yong_shen = []
    
    is_true_transformation = False
    transform_god_element = None
    is_zhuan_wang = False
    zhuan_wang_name = ""
    is_earth_dominant = False
    
    def stem_has_root(stem):
        info = STEMS_INFO.get(stem)
        if not info: return False
        stem_el = info.el
        for branch in branches:
            branch_roots = RAW_HIDDEN_STEMS.get(branch, {})
            # 1. 本气/中气同字
            if branch_roots.get(stem, 0) >= 9: return True
            # 2. 同五行且强根
            for hidden, weight in branch_roots.items():
                h_info = STEMS_INFO.get(hidden)
                if h_info and h_info.el == stem_el and weight >= 18:
                    return True
        return False

    # 4.1 化气格
    for rule in TRANSFORM_RULES:
        pair, target_el, valid_months, blockers, cleaners = rule
        
        if dm_stem in pair:
            pair_list = list(pair)
            is_pair_present = all(s in stems for s in pair_list)
            
            if is_pair_present:
                if month_branch in valid_months:
                    is_blocked = False
                    block_reasons = []
                    
                    if stem_has_root(dm_stem):
                        is_blocked = True
                        block_reasons.append("日干有根无法化气")
                        
                    if target_el == '土':
                        earth_branches = [b for b in branches if b in WET_EARTH + DRY_EARTH]
                        has_wu_ji = '戊' in stems or '己' in stems
                        if len(earth_branches) < 2:
                            is_blocked = True
                            block_reasons.append(f"地支土仅{len(earth_branches)}个(需>=2)")
                        if not has_wu_ji:
                            is_blocked = True
                            block_reasons.append("天干未透戊己土")
                    elif target_el == '金':
                        metal_branches = [b for b in branches if b in ['申', '酉']]
                        if len(metal_branches) < 1 and month_branch not in ['申', '酉']:
                            is_blocked = True
                            block_reasons.append("地支无金气支撑")
                    elif target_el == '水':
                        water_branches = [b for b in branches if b in ['亥', '子']]
                        if len(water_branches) < 1 and month_branch not in ['亥', '子']:
                            is_blocked = True
                            block_reasons.append("地支无水气支撑")
                            
                    blocker_found = []
                    for s in stems:
                        if s not in pair:
                            info = STEMS_INFO.get(s)
                            if info and info.el in blockers:
                                blocker_found.append(s)
                                
                    transform_log_detail = ""
                    if blocker_found and not is_blocked:
                        has_cleaner = False
                        for s in stems:
                            info = STEMS_INFO.get(s)
                            if info and info.el in cleaners: has_cleaner = True
                        
                        if has_cleaner:
                            pair_list.sort()
                            transform_log_detail = f"✨ 真化气格：[{''.join(pair_list)}]合化[{target_el}]，虽有[{''.join(blocker_found)}]阻碍，幸得救应去浊留清"
                        else:
                            is_blocked = True
                            block_reasons.append(f"有[{''.join(blocker_found)}]克化神且无制")
                            
                    if is_blocked:
                        pair_list.sort()
                        physics_log.append(f"🔗 假化气格：[{''.join(pair_list)}]合而不化 - {'; '.join(block_reasons)}")
                    else:
                        if not transform_log_detail:
                            pair_list.sort()
                            transform_log_detail = f"✨ 真化气格：[{''.join(pair_list)}]合化[{target_el}]，月令支持，化神旺，日干无根"
                        physics_log.append(transform_log_detail)
                        is_true_transformation = True
                        transform_god_element = target_el
                        break

    # 4.2 会局引动 (简化版)
    if not is_true_transformation:
        # 申子
        if '申' in branches and '子' in branches and month_branch in ['亥', '子']:
            if has_water_stem:
                physics_log.append("🌊 申子化水：天干透水引动，申金根气清空")
                if '申' in hidden_stems: hidden_stems['申'] = {'壬': 30}
            else:
                physics_log.append("🔗 申子羁绊：水未透干，合而不化，根气保留")
        # 亥卯
        if '亥' in branches and '卯' in branches and month_branch in ['寅', '卯']:
            if has_wood_stem:
                physics_log.append("🌲 亥卯化木：天干透木引动，亥水根气清空")
                if '亥' in hidden_stems: hidden_stems['亥'] = {'甲': 30}
            else:
                physics_log.append("🔗 亥卯羁绊：木未透干，合而不化")
        # 巳酉
        if '巳' in branches and '酉' in branches and month_branch in ['申', '酉']:
            if has_metal_stem:
                physics_log.append("⚔ 巳酉化金：天干透金引动，巳火变性")
                if '巳' in hidden_stems: hidden_stems['巳'] = {'庚': 30}
        # 寅午
        if '寅' in branches and '午' in branches and month_branch in ['巳', '午']:
            if has_fire_stem:
                physics_log.append("🔥 寅午化火：天干透火引动，寅木化火")
                if '寅' in hidden_stems: hidden_stems['寅'] = {'丙': 30}

    # 4.3 烈火分级
    fire_score = 0
    if month_branch in ['巳', '午']: fire_score += 2.0
    elif month_branch in ['未', '戌']: fire_score += 0.5
    
    if branches[2] in ['巳', '午']: fire_score += 1.5
    if branches[0] in ['巳', '午']: fire_score += 1.0
    if branches[3] in ['巳', '午']: fire_score += 1.0
    
    for s in stems:
        if s in ['丙', '丁']: fire_score += 1.0
        
    is_hot_season = month_branch in ['巳', '午', '未', '戌']
    
    if is_hot_season and not is_true_transformation:
        if fire_score >= 3.5:
            for wet_earth in WET_EARTH:
                if wet_earth in hidden_stems:
                    if wet_earth == '丑':
                        hidden_stems['丑'] = {'己': 28}
                        physics_log.append(f"🔥🔥 烈火烤土(丑)：火力评分{fire_score}，水气彻底蒸发 (真从)")
                    elif wet_earth == '辰':
                        is_gaitou = any(p['tiangan'] == '戊' and p['dizhi'] == '辰' for p in pillars)
                        hidden_stems['辰'] = {'戊': 28}
                        if is_gaitou:
                            physics_log.append("🧱 盖头之克(戊辰)：火月戊土透干，吸干辰中水木")
                        else:
                            physics_log.append(f"🔥🔥 烈火烤土(辰)：火力评分{fire_score}，水木皆亡")
        elif fire_score >= 2.5:
            if '丑' in hidden_stems and '癸' in hidden_stems['丑']:
                hidden_stems['丑']['癸'] *= 0.2
                physics_log.append("🔥 烈火烤土(丑)：水气微存 (假从)")

    # 4.4 专旺
    is_zhuan_wang = False
    zhuan_wang_name = ""
    
    if not is_true_transformation:
        def has_fang(el):
            if el == '木': return '寅' in branches and '卯' in branches and '辰' in branches
            if el == '火': return '巳' in branches and '午' in branches and '未' in branches
            if el == '金': return '申' in branches and '酉' in branches and '戌' in branches
            if el == '水': return '亥' in branches and '子' in branches and '丑' in branches
            return False
            
        def has_ju(el):
            if el == '木': return '亥' in branches and '卯' in branches and '未' in branches
            if el == '火': return '寅' in branches and '午' in branches and '戌' in branches
            if el == '金': return '巳' in branches and '酉' in branches and '丑' in branches
            if el == '水': return '申' in branches and '子' in branches and '辰' in branches
            return False
            
        def has_strong_killer(killer_el):
            killer_count = counts.get(killer_el, 0)
            stem_killer = any(STEMS_INFO[s].el == killer_el for s in stems)
            return stem_killer or killer_count > 0

        if dm_el == '木':
            if (has_fang('木') or has_ju('木') or counts['木'] >= 5) and not has_strong_killer('金'):
                is_zhuan_wang = True
                zhuan_wang_name = "专旺格 (曲直/木)"
                physics_log.append("🌲 曲直成格：木气成方/局，不见强金破格")
                forced_yong_shen = ["木(比劫)", "水(印星)", "火(食伤)"]
        elif dm_el == '火':
            if (has_fang('火') or has_ju('火') or counts['火'] >= 5) and not has_strong_killer('水'):
                is_zhuan_wang = True
                zhuan_wang_name = "专旺格 (炎上/火)"
                physics_log.append("🔥 炎上成格：火气成方/局，不见强水破格")
                forced_yong_shen = ["火(比劫)", "木(印星)", "土(食伤)"]
        elif dm_el == '土':
            four_ku = '辰' in branches and '戌' in branches and '丑' in branches and '未' in branches
            earth_dom = (counts['土'] + counts['火'] >= 6)
            zi_chou_earth = '子' in branches and '丑' in branches and earth_dom
            
            if (four_ku or earth_dom or zi_chou_earth) and not has_strong_killer('木'):
                is_zhuan_wang = True
                is_earth_dominant = True
                zhuan_wang_name = "专旺格 (稼穑/土)"
                physics_log.append("🧱 稼穑成格：土气专旺，不见强木破格")
                forced_yong_shen = ["土(比劫)", "火(印星)", "金(食伤)"]
        elif dm_el == '金':
            if (has_fang('金') or has_ju('金') or counts['金'] >= 5) and not has_strong_killer('火'):
                is_zhuan_wang = True
                zhuan_wang_name = "专旺格 (从革/金)"
                physics_log.append("⚔ 从革成格：金气成方/局，不见强火破格")
                forced_yong_shen = ["金(比劫)", "土(印星)", "水(食伤)"]
        elif dm_el == '水':
            if (has_fang('水') or has_ju('水') or counts['水'] >= 5) and not has_strong_killer('土'):
                is_zhuan_wang = True
                zhuan_wang_name = "专旺格 (润下/水)"
                physics_log.append("🌊 润下成格：水气成方/局，不见强土破格")
                forced_yong_shen = ["水(比劫)", "金(印星)", "木(食伤)"]

    # 水多土流
    if dm_el == '土' and counts['水'] >= 3 and month_branch in ['亥', '子'] and not is_earth_dominant:
        is_water_success = any("化水" in l for l in physics_log)
        if is_water_success or counts['水'] >= 5:
            physics_log.append("🌊 水多土流：冬土遇洪，根气全消")
            forced_yong_shen = ["水(财星)", "木(官杀)"]
            
    # 5. 旺衰评分 (Z-Score)
    idx = WU_XING_LIST.index(dm_el)
    text_relation = {
        'Self': dm_el,
        'Output': WU_XING_LIST[(idx + 1) % 5],
        'Wealth': WU_XING_LIST[(idx + 2) % 5],
        'Official': WU_XING_LIST[(idx + 3) % 5],
        'Resource': WU_XING_LIST[(idx + 4) % 5]
    }
    relations = text_relation
    support_els = [relations['Self'], relations['Resource']]
    
    month_roots = hidden_stems.get(month_branch, {})
    month_score = 0
    month_main_qi = DI_ZHI_CANG_GAN[month_branch][0]
    month_main_el = get_element(month_main_qi)
    
    # ---------------------------
    # 调候检测 (简化逻辑翻译)
    # ---------------------------
    def is_resource_ineffective(day_master_el, resource_el, month_br, all_branches, all_stems):
        FIRE_BRANCHES = ['巳', '午']
        WATER_BRANCHES = ['亥', '子']
        DRY_EARTH_BR = ['戌', '未']
        WET_EARTH_BR = ['辰', '丑']
        EARTH_BRANCHES = DRY_EARTH_BR + WET_EARTH_BR
        
        def count_branches(target_list):
            return len([b for b in all_branches if b in target_list])
            
        def has_stem_element(target_el):
            return any(STEMS_INFO[s].el == target_el for s in all_stems)
            
        # 1. 燥土不生金
        if day_master_el == '金' and resource_el == '土':
            is_fire_month = month_br in FIRE_BRANCHES
            fire_dry_count = count_branches(FIRE_BRANCHES + DRY_EARTH_BR)
            has_water = count_branches(WATER_BRANCHES) > 0 or has_stem_element('水')
            has_wet_earth = count_branches(WET_EARTH_BR) > 0
            if is_fire_month and fire_dry_count >= 3 and not has_water and not has_wet_earth:
                return True, "🔥 燥土不生金：火旺土燥，印星失效"
                
        # 2. 寒水不生木
        if day_master_el == '木' and resource_el == '水':
            is_water_month = month_br in WATER_BRANCHES
            water_cold_count = count_branches(WATER_BRANCHES + ['丑'])
            has_fire = count_branches(FIRE_BRANCHES) > 0 or has_stem_element('火')
            if is_water_month and water_cold_count >= 3 and not has_fire:
                return True, "❄️ 寒水不生木：水寒木冻，印星失效"
                
        # 3. 湿木不生火
        if day_master_el == '火' and resource_el == '木':
            is_water_month = month_br in WATER_BRANCHES
            water_count = count_branches(WATER_BRANCHES)
            has_wood_root = '寅' in all_branches or '卯' in all_branches
            if is_water_month and water_count >= 2 and not has_wood_root:
                return True, "💧 湿木不生火：水旺木湿，印星失效"
                
        # 4. 土多金埋
        if day_master_el == '水' and resource_el == '金':
            is_earth_month = month_br in EARTH_BRANCHES
            earth_count = count_branches(EARTH_BRANCHES)
            has_metal_root = '申' in all_branches or '酉' in all_branches
            if is_earth_month and earth_count >= 3 and not has_metal_root:
                return True, "🪨 土多金埋：土重金沉，印星失效"
        
        return False, ""

    def has_flow_chain(month_el, day_master_el, all_stems):
        flow_cycle = ['木', '火', '土', '金', '水']
        month_idx = flow_cycle.index(month_el)
        dm_idx = flow_cycle.index(day_master_el)
        sheng_el = flow_cycle[(month_idx + 1) % 5]
        resource_el = flow_cycle[(dm_idx + 4) % 5]
        
        if sheng_el != resource_el: return False
        
        has_resource_stem = False
        for s in all_stems:
            s_info = STEMS_INFO.get(s)
            if s_info and s_info.el == resource_el:
                has_resource_stem = True
                break
        if not has_resource_stem: return False
        
        ineffective, reason = is_resource_ineffective(day_master_el, resource_el, month_branch, branches, stems)
        if ineffective:
            physics_log.append(reason)
            return False
        return True

    is_month_hostile = False
    if month_main_el and CONTROLLING.get(month_main_el) == dm_el:
        if has_flow_chain(month_main_el, dm_el, stems):
            is_month_hostile = False
            physics_log.append(f"🔄 官印相生：{month_main_el}生{WU_XING_LIST[(WU_XING_LIST.index(month_main_el)+1)%5]}，印透干生身，月令之克被化解")
        else:
            is_month_hostile = True

    for root, weight in month_roots.items():
        root_el = get_element(root)
        is_self = (root_el == dm_el)
        resource_el_const = WU_XING_LIST[(idx + 4) % 5] # Note: idx was computed from DM
        is_resource = (root_el == resource_el_const)
        
        final_weight = weight
        if is_month_hostile:
            if is_self or is_resource: final_weight *= 0.3
        else:
            if is_resource: final_weight *= 0.7
            
        if is_self or is_resource:
            month_score += final_weight

    # 根气得分
    roots_score = 0
    for i in [0, 2, 3]:
        br = branches[i]
        c_score = 0
        branch_roots = hidden_stems.get(br, {})
        for root, weight in branch_roots.items():
            rel = get_element(root)
            if rel == dm_el: c_score += weight
            elif rel in support_els: c_score += weight * 0.7
        roots_score += c_score
        
    # 天干得分
    stems_score = 0
    for i, s in enumerate(stems):
        if i != 2:
            s_el = get_element(s)
            if s_el and s_el in support_els:
                stems_score += 10

    # V33
    total_same_party = 0
    total_opposite_party = 0
    
    def add_score(el, weight):
        nonlocal total_same_party, total_opposite_party
        if el == dm_el:
            total_same_party += weight
        elif el in support_els:
            ineffective, _ = is_resource_ineffective(dm_el, el, month_branch, branches, stems)
            if ineffective:
                total_same_party += weight * 0.8
            else:
                total_same_party += weight * 0.7
        else:
            total_opposite_party += weight

    for b in branches:
        roots = RAW_HIDDEN_STEMS.get(b, {})
        for h, w in roots.items():
            h_el = get_element(h)
            if h_el:
                adj_weight = w
                if h_el == relations['Output'] and month_branch in ['午', '巳']:
                    adj_weight *= 0.8
                add_score(h_el, adj_weight)

    for i, s in enumerate(stems):
        if i != 2:
            s_el = get_element(s)
            if s_el: add_score(s_el, 12)

    # 月令修正
    month_correction_factor = 1.0
    extra_penalty = 0

    if total_opposite_party > total_same_party * 1.5:
        is_de_ling = (month_main_el == dm_el)
        has_strong_root = any(
            any(STEMS_INFO[h].el == dm_el and w >= 18 for h, w in RAW_HIDDEN_STEMS.get(b, {}).items())
            for b in branches
        )
        if is_de_ling and has_strong_root:
            month_correction_factor *= 0.8
            extra_penalty += 1.0
            physics_log.append("⚠️ 异党虽众(1.5x)，但日主得令且有强根，惩罚力度减半：月令折扣0.8")
        else:
            month_correction_factor *= 0.6
            extra_penalty += 2.0
            physics_log.append(f"⚠️ 异党成势：异党得分{total_opposite_party:.1f} vs 同党{total_same_party:.1f}，印比失势，月令折扣0.6")
    elif total_opposite_party > total_same_party * 1.2:
        month_correction_factor *= 0.8
        extra_penalty += 1.0

    # 官杀混杂
    has_visible_output = counts.get(relations['Output'], 0) > 0
    has_hidden_output = False
    for br in branches:
        roots = RAW_HIDDEN_STEMS.get(br, {})
        for h, w in roots.items():
            if get_element(h) == relations['Output'] and w >= 9:
                has_hidden_output = True
                break
                
    if counts.get(relations['Official'], 0) >= 3 and not has_visible_output and not has_hidden_output:
        is_de_ling = (month_main_el == dm_el)
        if is_de_ling:
            extra_penalty += 0.5
            physics_log.append("⚔️ 官杀虽众且无制，但日主得令有根，抗压能力强，减免扣分")
        else:
            extra_penalty += 1.5
            physics_log.append("⚔️ 官杀混杂无制：克身太过，额外扣分")

    month_score *= month_correction_factor

    # 禄刃加成
    lu_ren_bonus = 0
    if month_branch == REN_MAP.get(dm_stem) or month_branch == LU_MAP.get(dm_stem):
        lu_ren_bonus += 1.0
        physics_log.append(f"✨ 得令加成：日主生于{month_branch}月，得{'刃' if month_branch == REN_MAP.get(dm_stem) else '禄'}气，气势雄厚")
        
        other_brs = [branches[0], branches[2], branches[3]]
        repeat_count = other_brs.count(month_branch)
        if repeat_count > 0:
            lu_ren_bonus += repeat_count * 0.8
            physics_log.append(f"✨ 禄刃重逢：地支另见{repeat_count}个{month_branch}，日主极旺")

    # 同党成势补偿
    extra_bonus = 0
    if total_same_party > total_opposite_party:
        if month_score < 10:
            if total_same_party > total_opposite_party * 1.5:
                extra_bonus += 2.5
                physics_log.append(f"💪 得势不虚：同党得分{total_same_party:.1f} >> 异党{total_opposite_party:.1f}，虽失令但党众极强，强力加分")
            else:
                extra_bonus += 1.5
                physics_log.append(f"📈 得势补偿：同党得分{total_same_party:.1f} > 异党{total_opposite_party:.1f}，虽失令但有帮扶，给予补偿")
        else:
            if total_same_party > total_opposite_party * 2.0:
                extra_bonus += 1.0

    # 三合三会
    formation_score = 0
    
    def check_formation_v35():
        score = 0
        log = ""
        formations = {
            '木': {'fang': ['寅', '卯', '辰'], 'ju': ['亥', '卯', '未']},
            '火': {'fang': ['巳', '午', '未'], 'ju': ['寅', '午', '戌']},
            '金': {'fang': ['申', '酉', '戌'], 'ju': ['巳', '酉', '丑']},
            '水': {'fang': ['亥', '子', '丑'], 'ju': ['申', '子', '辰']},
            '土': {'fang': [], 'ju': []}
        }
        
        for el, config in formations.items():
            has_fang_check = config['fang'] and all(b in branches for b in config['fang'])
            has_ju_check = config['ju'] and all(b in branches for b in config['ju'])
            
            if has_fang_check or has_ju_check:
                type_name = "三会" if has_fang_check else "三合"
                b_list = config['fang'] if has_fang_check else config['ju']
                is_transmitted = any(STEMS_INFO[s].el == el for s in stems)
                
                is_self_party = (el == dm_el or el in support_els)
                is_direct_self = (el == dm_el)
                
                if is_direct_self:
                    b = 4.5 if is_transmitted else 3.0
                    score += b
                    log += f"🏗️ {type_name}{el}局：地支{''.join(b_list)}，{'天干透出，力大无穷' if is_transmitted else '天干未透，气势已成'} (+{b})"
                elif is_self_party:
                    b = 2.5 if is_transmitted else 1.5
                    score += b
                    log += f"🏗️ {type_name}{el}印局：地支{''.join(b_list)}，生身有力 (+{b})"
                else:
                    p = 3.5 if is_transmitted else 2.0
                    score -= p
                    log += f"🌪️ {type_name}{el}异党局：地支{''.join(b_list)}，{'天干透出，克泄交加' if is_transmitted else '地支暗涌'} (-{p})"
        return score, log
        
    f_score, f_log = check_formation_v35()
    if f_score != 0:
        formation_score = f_score
        physics_log.append(f_log)
        
    z_score = (0.1585 * month_score) + (0.0139 * roots_score) + (0.0336 * stems_score) - 2.2463 - extra_penalty + extra_bonus + formation_score + lu_ren_bonus
    if is_earth_dominant: z_score += 5.0
    
    z_score = round(z_score, 2)
    verdict = "身强" if z_score > 0 else "身弱"
    
    # -------------------------------------------------------------------------
    # 6. 格局裁决 & 智能防御
    # -------------------------------------------------------------------------
    pattern_code = "Normal"
    calc_pattern = "普通格局"
    transform_ji_shen = []
    
    stem_gods = []
    for i, s in enumerate(stems):
        if i != 2:
            s_info = STEMS_INFO.get(s)
            if s_info:
                for god_key, el in relations.items():
                    if el == s_info.el: stem_gods.append(god_key)

    if is_true_transformation and transform_god_element:
        calc_pattern = f"真化气格 (化{transform_god_element})"
        pattern_code = "Transform"
        
        trans_idx = WU_XING_LIST.index(transform_god_element)
        xie_shen = WU_XING_LIST[(trans_idx + 1) % 5]
        ke_shen = WU_XING_LIST[(trans_idx + 3) % 5]
        sheng_ke = WU_XING_LIST[(trans_idx + 2) % 5]
        forced_yong_shen = [transform_god_element, xie_shen]
        transform_ji_shen = [ke_shen, sheng_ke]
        
    elif forced_yong_shen:
        if any("水多土流" in l for l in physics_log):
            calc_pattern = "身弱 (水多土流)"
            pattern_code = "Normal"
        elif is_zhuan_wang:
            calc_pattern = zhuan_wang_name
            pattern_code = "Follow_Strong"
        elif any("财星" in s for s in forced_yong_shen):
            calc_pattern = "真从格 (弃命相从)"
            pattern_code = "Follow_Weak"
            
    elif is_zhuan_wang:
        calc_pattern = zhuan_wang_name
        pattern_code = "Follow_Strong"
        
    elif z_score < -1.5:
        # Hard Defense
        def get_day_seat_defense(day_br):
            day_br_roots = RAW_HIDDEN_STEMS.get(day_br, {})
            main_qi_item = next((item for item in day_br_roots.items() if item[1] >= 18), None)
            if main_qi_item:
                main_stem = main_qi_item[0]
                info = STEMS_INFO.get(main_stem)
                if info and info.el == dm_el:
                    return True, f"日支{day_br}本气{main_stem}为日主同五行({dm_el})，坐禄/比/劫，根气强劲，绝不入从"
            return False, ""

        def count_same_party_branches():
            count = 0
            for br in branches:
                roots = RAW_HIDDEN_STEMS.get(br, {})
                has_root = False
                for h, w in roots.items():
                    h_info = STEMS_INFO.get(h)
                    if h_info and h_info.el == dm_el and w >= 9:
                        has_root = True
                if has_root: count += 1
            return count

        day_seat_defense, day_seat_reason = get_day_seat_defense(branches[2])
        same_party_branch_count = count_same_party_branches()
        
        if day_seat_defense:
            physics_log.append(f"🛡️ 硬性防从：{day_seat_reason}")
            calc_pattern = "身弱 (日座有根)"
            pattern_code = "Normal"
        elif same_party_branch_count >= 2:
            physics_log.append(f"🛡️ 硬性防从：地支有{same_party_branch_count}个日主同五行根气(中气以上)，根重不入从")
            calc_pattern = "身弱 (根众)"
            pattern_code = "Normal"
        else:
            resource_element = relations['Resource']
            resource_stems = [s for s in stems if get_element(s) == resource_element]
            has_resource_root = False
            for b in branches:
                roots = RAW_HIDDEN_STEMS.get(b, {})
                for h in roots.keys():
                    h_el = get_element(h)
                    if h_el == resource_element or (resource_element == '火' and h_el in ['木', '火']):
                        has_resource_root = True
            
            if len(resource_stems) >= 2:
                physics_log.append(f"🛡️ 硬性防从：天干透出{len(resource_stems)}个印星[{''.join(resource_stems)}]，保护神显露，不入从格")
                calc_pattern = "身弱 (印星双透)"
                pattern_code = "Normal"
            elif len(resource_stems) == 1 and has_resource_root:
                physics_log.append(f"🛡️ 硬性防从：天干透出印星[{resource_stems[0]}]且地支有生扶，绝不入从")
                calc_pattern = "身弱 (印星有根)"
                pattern_code = "Normal"
            else:
                has_strong_root = False
                has_weak_root = False
                
                for b in branches:
                    roots = RAW_HIDDEN_STEMS.get(b, {})
                    if dm_stem in roots:
                        if roots[dm_stem] >= 18: has_strong_root = True
                        elif roots[dm_stem] >= 3: has_weak_root = True
                    for h, w in roots.items():
                        h_info = STEMS_INFO.get(h)
                        if h_info and h_info.el == dm_el:
                            if w >= 18: has_strong_root = True
                            elif w >= 9: has_weak_root = True
                
                dry_earth_in_branches = [b for b in branches if b in DRY_EARTH]
                has_dry_earth = len(dry_earth_in_branches) > 0
                dry_earth_weakened = False
                
                if has_dry_earth:
                    if (('辰' in branches and '戌' in branches) or ('丑' in branches and '未' in branches)):
                        dry_earth_weakened = True
                        pair = '辰戌' if '辰' in branches else '丑未'
                        physics_log.append(f"🔀 {pair}相冲：燥土力量削弱，可入从格")
                    if month_branch in ['亥', '子'] and not dry_earth_weakened:
                        dry_earth_weakened = True
                        physics_log.append(f"💧 月令{month_branch}水旺：燥土被水克，力量削弱")
                        
                is_yang_stem = dm_stem in ['甲', '丙', '戊', '庚', '壬']
                has_bijie_in_stems = False
                bijie_has_root = False
                bijie_stems = []
                for i, s in enumerate(stems):
                    if i != 2:
                        s_info = STEMS_INFO.get(s)
                        if s_info and s_info.el == dm_el:
                            has_bijie_in_stems = True
                            bijie_stems.append(s)
                            
                if has_bijie_in_stems:
                    for b in branches:
                        roots = RAW_HIDDEN_STEMS.get(b, {})
                        for h, w in roots.items():
                            h_info = STEMS_INFO.get(h)
                            if h_info and h_info.el == dm_el and w >= 9:
                                bijie_has_root = True
                                
                if has_bijie_in_stems and is_yang_stem and bijie_has_root:
                    physics_log.append(f"🔥 天干透比劫[{', '.join(bijie_stems)}]且有根：阳干有帮身，不入从格")
                elif has_bijie_in_stems and is_yang_stem and not bijie_has_root:
                    physics_log.append(f"💨 天干透比劫[{', '.join(bijie_stems)}]但无根：比劫虚浮，可入从格")
                    
                effective_has_dry_earth = has_dry_earth and not dry_earth_weakened
                can_enter_cong = not has_strong_root and not effective_has_dry_earth and not (has_bijie_in_stems and is_yang_stem and bijie_has_root)
                
                if can_enter_cong:
                    cong_type = "从弱"
                    cong_element = None
                    
                    stem_god_counts = { 'Wealth': 0, 'Official': 0, 'Output': 0 }
                    for g in stem_gods:
                        if g in stem_god_counts: stem_god_counts[g] += 1
                        
                    if stem_god_counts['Official'] > 0 and counts.get(relations['Official'], 0) >= 2:
                        cong_type = "从杀格"
                        cong_element = relations['Official']
                    elif stem_god_counts['Wealth'] > 0 and counts.get(relations['Wealth'], 0) >= 2:
                        cong_type = "从财格"
                        cong_element = relations['Wealth']
                    elif stem_god_counts['Output'] > 0 and counts.get(relations['Output'], 0) >= 2:
                        cong_type = "从儿格"
                        cong_element = relations['Output']
                        
                    if has_weak_root and is_yang_stem:
                        calc_pattern = f"假{cong_type} (余气微根)"
                        pattern_code = "Fake_Follow"
                        physics_log.append(f"🌀 假从格：{dm_stem}为阳干，地支仅有余气微根，形成假{cong_type}")
                        physics_log.append("⚠️ 假从格注意：大运喜忌具有动态性，需结合行运判断吉凶")
                        
                        if cong_element:
                            c_idx = WU_XING_LIST.index(cong_element)
                            sheng_cong = WU_XING_LIST[(c_idx - 1 + 5) % 5]
                            forced_yong_shen = [cong_element, sheng_cong]
                    elif not has_weak_root:
                        calc_pattern = f"真{cong_type} (弃命相从)"
                        pattern_code = "Follow_Weak"
                        if cong_element:
                            c_idx = WU_XING_LIST.index(cong_element)
                            sheng_cong = WU_XING_LIST[(c_idx - 1 + 5) % 5]
                            forced_yong_shen = [cong_element, sheng_cong]
                    else:
                        calc_pattern = "假从格 / 极弱"
                        pattern_code = "Fake_Follow"
                elif has_dry_earth and not (has_bijie_in_stems and is_yang_stem):
                    physics_log.append(f"🏜️ 燥土防从：地支有[{', '.join(dry_earth_in_branches)}]燥土，可助日干，不入真从")
                    calc_pattern = "假从格 (燥土微根)"
                    pattern_code = "Fake_Follow"
                    physics_log.append("⚠️ 假从格注意：大运喜忌具有动态性，需结合行运判断吉凶")
                elif not (has_bijie_in_stems and is_yang_stem):
                    calc_pattern = "假从格 / 极弱"
    # elif z_score > 3.0:
    #     calc_pattern = "专旺格"
    #     pattern_code = "Follow_Strong"

    # 7. 智能防御
    is_betrayal = False
    is_fighting = False
    conflict_log = ""
    
    if pattern_code in ['Follow_Weak', 'Fake_Follow'] and pattern_code != 'Transform':
        has_output = 'Output' in stem_gods
        has_official = 'Official' in stem_gods
        
        if has_output and has_official:
            found_combine = False
            for rule in TRANSFORM_RULES:
                pair = list(rule[0])
                intersect = [s for s in pair if s in stems]
                if len(intersect) == 2:
                    e1, e2 = intersect
                    g1 = get_ten_god(e1, dm_stem)
                    g2 = get_ten_god(e2, dm_stem)
                    outputs = ['食神', '伤官']
                    officials = ['正官', '七杀']
                    if (g1 in outputs and g2 in officials) or (g2 in outputs and g1 in officials):
                        found_combine = True
                        break
            
            if found_combine:
                is_betrayal = True
                conflict_log = "⚠️ 贪合忘克：食伤与官杀相合，救星叛变，强制真从"
            else:
                dm_has_strong_root = False
                for b in branches:
                    roots = RAW_HIDDEN_STEMS.get(b, {})
                    if roots.get(dm_stem, 0) >= 18: dm_has_strong_root = True
                    else:
                        for h, w in roots.items():
                            h_info = STEMS_INFO.get(h)
                            if h_info and h_info.el == dm_el and w >= 18: dm_has_strong_root = True
                if dm_has_strong_root:
                    is_fighting = True
                    conflict_log = "⚠️ 战克不从：天干透食伤制杀，日主有强根，心存反抗"
                    
    if is_betrayal:
        pattern_code = "Follow_Weak"
        calc_pattern = "真从格 (贪合忘克/弃命相从)"
        forced_yong_shen = [relations['Wealth'], relations['Official']]
    elif is_fighting:
        pattern_code = "Normal"
        calc_pattern = "身弱 (伤官见官 / 杀重身轻)"
        verdict = "身弱"
        
    if conflict_log:
        physics_log.insert(0, conflict_log)

    # 8. 喜用神生成
    def evaluate_element_power(target_el):
        score = 0
        month_main_qi_el = get_element(DI_ZHI_CANG_GAN[month_branch][0])
        if month_main_qi_el == target_el: score += 3
        else:
            month_hidden = DI_ZHI_CANG_GAN.get(month_branch, [])
            for i in range(1, len(month_hidden)):
                if get_element(month_hidden[i]) == target_el:
                    score += 1
                    break
        for i in [0, 2, 3]:
            br = branches[i]
            br_hidden = RAW_HIDDEN_STEMS.get(br, {})
            for hidden, weight in br_hidden.items():
                if get_element(hidden) == target_el:
                    if weight >= 18: score += 2
                    elif weight >= 9: score += 1
                    break
        for s in stems:
            if get_element(s) == target_el:
                score += 1
                break
        
        if score >= 6: return 'very_strong'
        if score >= 4: return 'strong'
        if score >= 2: return 'neutral'
        if score >= 1: return 'weak'
        return 'very_weak'

    element_powers = {el: evaluate_element_power(el) for el in WU_XING_LIST}
    
    def calculate_yong_shen_score(yong_el, ji_list):
        score = 5
        for ji in ji_list:
            ji_power = element_powers[ji]
            # Ke (Yong -> Ji)
            if WU_XING_LIST[(WU_XING_LIST.index(yong_el) + 2) % 5] == ji:
                if ji_power in ['very_strong', 'strong']: score += 15
                elif ji_power == 'neutral': score += 8
                else: score += 3
            # Sheng (Yong -> Ji)
            if WU_XING_LIST[(WU_XING_LIST.index(yong_el) + 1) % 5] == ji:
                if ji_power in ['very_strong', 'strong']: score -= 20
                elif ji_power == 'neutral': score -= 10
                else: score -= 3
            # Ke (Ji -> Yong)
            if WU_XING_LIST[(WU_XING_LIST.index(ji) + 2) % 5] == yong_el:
                is_self_element = (ji == relations['Self'])
                if not is_self_element:
                    if ji_power in ['very_strong', 'strong']: score -= 15
                    elif ji_power == 'neutral': score -= 8
        
        # Tongguan
        for ji in ji_list:
            ji_power = element_powers[ji]
            if ji_power in ['very_strong', 'strong']:
                ke_target = WU_XING_LIST[(WU_XING_LIST.index(ji) + 2) % 5]
                ke_target_power = element_powers[ke_target]
                if ke_target_power in ['weak', 'very_weak', 'neutral']:
                    sheng_from_ji = WU_XING_LIST[(WU_XING_LIST.index(ji) + 1) % 5]
                    sheng_to_target = WU_XING_LIST[(WU_XING_LIST.index(ke_target) + 4) % 5]
                    if yong_el == sheng_from_ji and yong_el == sheng_to_target:
                        score += 12
        return score

    yong_shen = []
    ji_shen = []

    if forced_yong_shen:
        yong_shen = [s.split('(')[0] for s in forced_yong_shen]
        yong_shen = [el for el in yong_shen if el in WU_XING_LIST]
        
        if pattern_code == 'Transform':
            ji_shen = transform_ji_shen
        elif pattern_code == 'Follow_Weak':
            ji_shen = [relations['Resource'], relations['Self']]
        elif pattern_code == 'Follow_Strong':
            ji_shen = [relations['Wealth'], relations['Official']]
    else:
        initial_yong = []
        initial_ji = []
        if pattern_code == 'Follow_Weak':
            initial_yong = [relations['Wealth'], relations['Official']]
            initial_ji = [relations['Resource'], relations['Self'], relations['Output']]
            if '从儿' in calc_pattern:
                initial_yong = [relations['Output'], relations['Wealth']]
                initial_ji = [relations['Resource'], relations['Official']]
        elif pattern_code == 'Fake_Follow':
            initial_yong = [relations['Output'], relations['Wealth'], relations['Official']]
            initial_ji = [relations['Resource'], relations['Self']]
        elif pattern_code == 'Follow_Strong':
            initial_yong = [relations['Resource'], relations['Self'], relations['Output']]
            initial_ji = [relations['Wealth'], relations['Official']]
        elif pattern_code == 'Normal':
            if verdict == '身弱':
                initial_yong = [relations['Resource'], relations['Self']]
                initial_ji = [relations['Official'], relations['Wealth'], relations['Output']]
            else:
                initial_yong = [relations['Official'], relations['Wealth'], relations['Output']]
                initial_ji = [relations['Resource'], relations['Self']]
        
        ji_shen = initial_ji
        
        scored = []
        for yong in initial_yong:
            s = calculate_yong_shen_score(yong, ji_shen)
            scored.append({'el': yong, 'score': s})
        scored.sort(key=lambda x: x['score'], reverse=True)
        yong_shen = [item['el'] for item in scored if item['score'] > 0]
        
        if not yong_shen and initial_yong:
             scored_fallback = [{'el': y, 'score': calculate_yong_shen_score(y, ji_shen)} for y in initial_yong]
             scored_fallback.sort(key=lambda x: x['score'], reverse=True)
             yong_shen = [scored_fallback[0]['el']]

    res.joy_gods = yong_shen
    res.ji_gods = ji_shen
    res.physics_log = physics_log
    res.z_score = z_score
    res.verdict = verdict
    res.body_strength = f"{verdict} ({calc_pattern})" if "普通" not in calc_pattern else verdict
    res.calc_pattern = calc_pattern
    res.pattern_code = pattern_code
    
    # Day Kong Wang
    def get_kong_wang(stem, branch):
        stems_arr = list("甲乙丙丁戊己庚辛壬癸")
        branches_arr = list("子丑寅卯辰巳午未申酉戌亥")
        if stem not in stems_arr or branch not in branches_arr: return []
        s_idx = stems_arr.index(stem)
        b_idx = branches_arr.index(branch)
        offset = b_idx - s_idx
        if offset < 0: offset += 12
        kw_map = {
            10: ['申', '酉'], 8: ['午', '未'], 6: ['辰', '巳'],
            4: ['寅', '卯'], 2: ['子', '丑'], 0: ['戌', '亥']
        }
        return kw_map.get(offset, [])

    res.day_kong_wang = get_kong_wang(pillars[2]['tiangan'], pillars[2]['dizhi'])
    
    return res

# =========================================================================
# 4. 交互与演示 (Demo)
# =========================================================================

def parse_input_mode():
    print("🐯 旺衰算法 Python 版 (V36) 🐯")
    print("请选择输入模式:")
    print("1. 公历日期 (例如: 1900年01月01日 00:00 男命)")
    print("2. 直接输入四柱 (例如: 癸卯 壬戌 丁巳 丙午 男)")
    
    choice = input("请输入 (1/2): ").strip()
    return choice

def get_gender_text(g):
    return "乾造" if g == 1 else "坤造"

def run_demo():
    import re
    mode = parse_input_mode()
    
    date_str = ""
    gender = 1 # 1: Male, 0: Female
    pillars = []
    da_yun_list = []
    
    if mode == '1':
        # Clean robust parsing for Gregorian
        print("💡 支持各种常见分隔符 (空格 . - / 年月日 _)")
        raw_input = input("请输入 (例如: 1900.01.01 00:00 男): ").strip()
        
        try:
            # 1. Gender Detection (Text keywords first)
            gender = 1 # Default
            gender_found = False
            
            # Remove date/time like characters to avoid interference (minimal risk for gender chars)
            # Check for explicit keywords
            if re.search(r'(男|乾|man|male)', raw_input, re.IGNORECASE):
                gender = 1
                gender_found = True
            elif re.search(r'(女|坤|woman|female)', raw_input, re.IGNORECASE):
                gender = 0
                gender_found = True
            elif re.search(r'(?<![a-zA-Z])M(?![a-zA-Z])', raw_input, re.IGNORECASE): # Single M
                gender = 1
                gender_found = True
            elif re.search(r'(?<![a-zA-Z])(F|W)(?![a-zA-Z])', raw_input, re.IGNORECASE): # Single F or W
                gender = 0
                gender_found = True
                
            # 2. Extract Numbers
            # Replace common non-digit separators with space to ensure separation
            cleaned = re.sub(r'[^\d]', ' ', raw_input)
            ints = [int(n) for n in re.findall(r'\d+', cleaned)]
            
            if len(ints) < 5:
                raise ValueError("未识别到足够的日期时间数字 (需年、月、日、时、分)")
                
            y, m, d, h, minute = ints[0], ints[1], ints[2], ints[3], ints[4]
            
            # 3. Numeric Gender Check (if not found by text)
            if not gender_found and len(ints) >= 6:
                last_val = ints[5]
                if last_val in [0, 1]:
                    gender = last_val
                    gender_found = True
                    print(f"ℹ️ 检测到性别数字标识: {gender} ({get_gender_text(gender)})")
            
            if not gender_found:
                print("⚠️ 未检测到明确性别标识，系统默认为: 男(乾造)")
                
            # Basic Validation
            if m < 1 or m > 12: raise ValueError(f"月份错误: {m}")
            if d < 1 or d > 31: raise ValueError(f"日期错误: {d}")
            if h < 0 or h > 23: raise ValueError(f"小时错误: {h}")
            if minute < 0 or minute > 59: raise ValueError(f"分钟错误: {minute}")
                
            if USE_LITE:
                # Lite Mode (No external Deps)
                sb = SimpleBazi(y, m, d, h, minute, gender)
                pillars, da_yun_list = sb.get_output()
                date_str = f"{y}年{m}月{d}日 {h}时{minute}分"
                
            else:
                # Full Mode (Lunar Python)
                solar = Solar.fromYmdHms(y, m, d, h, minute, 0)
                lunar = solar.getLunar()
                bazi = lunar.getEightChar()
            
                date_str = f"{y}年{m}月{d}日 {h}时{minute}分"
            
                # Pillars
                pillars = [
                    {'tiangan': bazi.getYearGan(), 'dizhi': bazi.getYearZhi()},
                    {'tiangan': bazi.getMonthGan(), 'dizhi': bazi.getMonthZhi()},
                    {'tiangan': bazi.getDayGan(), 'dizhi': bazi.getDayZhi()},
                    {'tiangan': bazi.getTimeGan(), 'dizhi': bazi.getTimeZhi()}
                ]
            
                # Da Yun
                yun = bazi.getYun(gender)
                da_yun_arr = yun.getDaYun()
                # Get first 8
                for i in range(1, 9):
                    da_yun_list.append(da_yun_arr[i].getGanZhi())
                
        except Exception as e:
            print(f"❌ 输入解析错误: {str(e)}")
            return

    elif mode == '2':
        # Four Pillars Directly
        raw_input = input("请输入四柱 (年 月 日 时 性别): ").strip()
        parts = raw_input.split()
        
        if len(parts) < 5:
            print("参数不足 [年 月 日 时 性别]")
            return
            
        p_strs = parts[:4]
        gender_raw = parts[4].strip()
        gender = 1
        
        # Robust Gender Parsing
        if gender_raw in ['男', '男命', '乾造', '1', 'M', 'Man']:
            gender = 1
        elif gender_raw in ['女', '女命', '坤造', '0', 'W', 'Woman', 'F', 'Female']:
            gender = 0
        else:
             print(f"⚠️ 性别 '{gender_raw}' 识别失败，默认为男(乾造)")
             gender = 1
        
        if any(len(p) != 2 for p in p_strs):
            print("柱格式错误 (应为2字符，如 甲子)")
            return
            
        pillars = [
            {'tiangan': p[0], 'dizhi': p[1]} for p in p_strs
        ]
        date_str = "四柱反推"
        print("⚠️ 直接输入四柱模式下，无法精确计算起运时间与交运脱运，大运仅供参考(盲排)")
        
        year_gan = pillars[0]['tiangan']
        month_gan = pillars[1]['tiangan']
        month_zhi = pillars[1]['dizhi']
        
        y_yinyang = TIAN_GAN_YIN_YANG.get(year_gan)
        is_shun = (gender == 1 and y_yinyang == '阳') or (gender == 0 and y_yinyang == '阴')
        
        mg_idx = TIAN_GAN.index(month_gan)
        mz_idx = DI_ZHI.index(month_zhi)
        
        for i in range(8):
            if is_shun:
                mg_idx = (mg_idx + 1) % 10
                mz_idx = (mz_idx + 1) % 12
            else:
                mg_idx = (mg_idx - 1 + 10) % 10
                mz_idx = (mz_idx - 1 + 12) % 12
            da_yun_list.append(TIAN_GAN[mg_idx] + DI_ZHI[mz_idx])


    # Calculate Wang Shuai
    result = calculate_wang_shuai(pillars)
    print_report(result, date_str, gender, pillars, da_yun_list)
    
# =========================================================================
# 5. Helper Functions (Parsing & Output)
# =========================================================================

def print_report(result, date_str, gender, pillars, da_yun_list):
    print("\n" + "="*40)
    print(f"公元：[{date_str}] [{get_gender_text(gender)}]")
    print("")
    
    p_str_list = [p['tiangan'] + p['dizhi'] for p in pillars]
    # Kong Wang
    kw = result.day_kong_wang
    kw_str = "".join(kw) if kw else "无"
    
    print(f"干支：[{'], ['.join(p_str_list)}]（空：[{kw_str}]）")
    print("")
    print(f"大运：[{'，'.join(da_yun_list)}...]")
    print("="*40)
    
    # Wang Shuai Info
    print(f"📊 旺衰结果:")
    print(f"🔹 判定: {result.verdict} ({result.body_strength})")
    print(f"🔹 建议喜用: {', '.join(result.joy_gods)} | 忌神: {', '.join(result.ji_gods)}")
    print(f"🔹 格局: {result.calc_pattern} ({result.formal_pattern})")
    print("-" * 40)
    print("📜 物理逻辑:")
    for log in result.physics_log:
        print(f"   {log}")
    print("="*40)

def parse_smart_input(raw_args_list):
    """
    智能解析命令行参数，支持任意分隔符的公历日期
    """
    import re
    full_input_str = " ".join(raw_args_list)
    
    # 提取数字
    numbers = re.findall(r'\d+', full_input_str)
    nums = [int(x) for x in numbers]
    
    if len(nums) == 5:
        nums.append(1) # Default male
        
    if len(nums) < 6:
        return None, f"❌ [解析失败] 提取到的数字不足6位: {nums}\n👉 请输入: 年 月 日 时 分 性别 (如: 1999 2 24 7 50 1)"
        
    return nums, None

def run_cli_mode(args):
    nums, error = parse_smart_input(args)
    if error:
        print(error)
        sys.exit(1)
        
    y, m, d, h, minute, g = nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]
    
    if g not in [0, 1]: g = 1
    
    try:
        if USE_LITE:
            sb = SimpleBazi(y, m, d, h, minute, g)
            pillars, da_yun_list = sb.get_output()
            date_str = f"{y}年{m}月{d}日 {h}时{minute}分"
        else:
            solar = Solar.fromYmdHms(y, m, d, h, minute, 0)
            lunar = solar.getLunar()
            bazi = lunar.getEightChar()
            
            date_str = f"{y}年{m}月{d}日 {h}时{minute}分"
            
            pillars = [
                {'tiangan': bazi.getYearGan(), 'dizhi': bazi.getYearZhi()},
                {'tiangan': bazi.getMonthGan(), 'dizhi': bazi.getMonthZhi()},
                {'tiangan': bazi.getDayGan(), 'dizhi': bazi.getDayZhi()},
                {'tiangan': bazi.getTimeGan(), 'dizhi': bazi.getTimeZhi()}
            ]
            
            yun = bazi.getYun(g)
            da_yun_arr = yun.getDaYun()
            da_yun_list = [da_yun_arr[i].getGanZhi() for i in range(1, 9)]
        
        result = calculate_wang_shuai(pillars)
        print_report(result, date_str, g, pillars, da_yun_list)
        
    except Exception as e:
        print(f"❌ 运行内部错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_cli_mode(sys.argv[1:])
    else:
        run_demo()
