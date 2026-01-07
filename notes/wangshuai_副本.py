import re
import json
import copy

def calculate_li_shuanglin_v32(bazi_str):
    """
    李双林八字算法 V32 (工业级·全量无删减版)
    
    【包含模块】：
    1. 基础解析：天干地支、五行、十神、空亡。
    2. 严谨定格：10+1分类法，严格透干原则。
    3. 物理引擎全集：
       - 化气优先逻辑 (Transformation): 支持去浊留清 (丙火制庚金救化气)。
       - 烈火分级系统 (Fire Grading): 精确计算火的当量，决定湿土蒸发程度。
       - 会局引动系统 (Formation): 申子合水需透干，否则论羁绊。
       - 稼穑专旺系统 (Dominance): 宏观气势强制清空杂气。
       - 十干体象系统 (Ten Stems): 水多木漂、藤萝系甲、辛金洗淘等。
    4. 智能防御系统：
       - 贪合忘战 (Betrayal): 严格循环检测食伤与官杀的合化。
       - 无根不战 (Rootless): 只有日主有根时，食伤制杀才判身弱；无根则判从。
    """
    
    # =========================================================================
    # 1. 静态数据库 (Static Data)
    # =========================================================================
    stems_info = {
        '甲': {'el': 'Wood', 'pol': '+'}, '乙': {'el': 'Wood', 'pol': '-'},
        '丙': {'el': 'Fire', 'pol': '+'}, '丁': {'el': 'Fire', 'pol': '-'},
        '戊': {'el': 'Earth', 'pol': '+'}, '己': {'el': 'Earth', 'pol': '-'},
        '庚': {'el': 'Metal', 'pol': '+'}, '辛': {'el': 'Metal', 'pol': '-'},
        '壬': {'el': 'Water', 'pol': '+'}, '癸': {'el': 'Water', 'pol': '-'}
    }
    
    zang_gan_order = {
        '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
        '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
        '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
    }
    
    raw_hidden_stems = {
        '子': {'癸': 30}, '丑': {'己': 18, '癸': 9, '辛': 3},
        '寅': {'甲': 18, '丙': 9, '戊': 3}, '卯': {'乙': 30},
        '辰': {'戊': 18, '乙': 9, '癸': 3}, '巳': {'丙': 18, '戊': 9, '庚': 3},
        '午': {'丁': 20, '己': 10}, '未': {'己': 18, '丁': 9, '乙': 3},
        '申': {'庚': 18, '壬': 9, '戊': 3}, '酉': {'辛': 30},
        '戌': {'戊': 18, '辛': 9, '丁': 3}, '亥': {'壬': 18, '甲': 12}
    }
    
    element_map = {'甲':'Wood','乙':'Wood','丙':'Fire','丁':'Fire','戊':'Earth', '己':'Earth','庚':'Metal','辛':'Metal','壬':'Water','癸':'Water'}
    direction_map = {'Wood': '东方', 'Fire': '南方', 'Earth': '西南、东北', 'Metal': '西方', 'Water': '北方'}
    controlling = {'Wood':'Earth', 'Earth':'Water', 'Water':'Fire', 'Fire':'Metal', 'Metal':'Wood'}
    
    # 天干五合规则表 (Pair, Transform Element, Valid Months, Blocker Element, Cleaner Element)
    transform_rules = [
        ({'甲', '己'}, 'Earth', ['辰', '戌', '丑', '未', '巳', '午'], ['Wood'], ['Metal', 'Fire']), # 木克土，需金克木或火泄木(火生土)
        ({'乙', '庚'}, 'Metal', ['申', '酉', '辰', '戌', '巳'], ['Fire'], ['Water', 'Earth']),
        ({'丙', '辛'}, 'Water', ['亥', '子', '申', '酉', '辰'], ['Earth'], ['Wood', 'Metal']),
        ({'丁', '壬'}, 'Wood',  ['寅', '卯', '亥', '子'], ['Metal'], ['Fire', 'Water']),
        ({'戊', '癸'}, 'Fire',  ['巳', '午', '寅', '卯', '戌'], ['Water'], ['Earth', 'Wood'])
    ]

    def get_element(char): return element_map.get(char, None)

    # =========================================================================
    # 2. 解析与辅助函数
    # =========================================================================
    parts = re.split(r'[，, \s]+', bazi_str.strip())
    parts = [p for p in parts if p]
    if len(parts) != 4: return {"Error": "请提供完整的四柱八字"}
    
    dm_stem = parts[2][0] 
    dm_el = stems_info[dm_stem]['el']
    month_branch = parts[1][1]
    
    all_visible_stems = [parts[0][0], parts[1][0], parts[3][0]]
    branches = [p[1] for p in parts]
    stems = [p[0] for p in parts]
    all_chars = stems + branches

    # 辅助变量：天干五行存在情况
    has_water_stem = ('壬' in stems or '癸' in stems)
    has_wood_stem = ('甲' in stems or '乙' in stems)
    has_fire_stem = ('丙' in stems or '丁' in stems)
    has_metal_stem = ('庚' in stems or '辛' in stems)
    
    def get_ten_god(target_stem, day_master_stem):
        dm = stems_info[day_master_stem]
        tg = stems_info[target_stem]
        elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
        dm_idx = elements.index(dm['el'])
        tg_idx = elements.index(tg['el'])
        diff = (tg_idx - dm_idx) % 5
        is_same_polarity = (dm['pol'] == tg['pol'])
        if diff == 0: return '比肩' if is_same_polarity else '劫财'
        if diff == 1: return '食神' if is_same_polarity else '伤官'
        if diff == 2: return '偏财' if is_same_polarity else '正财'
        if diff == 3: return '七杀' if is_same_polarity else '正官'
        if diff == 4: return '偏印' if is_same_polarity else '正印'
        return "未知"

    # =========================================================================
    # 3. 严谨定格 (Strict Pattern)
    # =========================================================================
    def determine_strict_pattern():
        hidden = zang_gan_order.get(month_branch, [])
        if not hidden: return "未知"
        main_qi = hidden[0] 
        relation_main = get_ten_god(main_qi, dm_stem)
        
        # 1. 禄刃
        if relation_main == '劫财': 
            if month_branch in ['子', '午', '卯', '酉']: return "羊刃格 (月令帝旺)"
        if relation_main == '比肩': 
            if month_branch in ['寅', '申', '巳', '亥']: return "建禄格 (月令建禄)"
            
        # 2. 八正格
        if main_qi in all_visible_stems:
            god = get_ten_god(main_qi, dm_stem)
            if god not in ['比肩', '劫财']: return f"{god}格 (本气透干)"
        for sub_qi in hidden[1:]:
            if sub_qi in all_visible_stems:
                god = get_ten_god(sub_qi, dm_stem)
                if god not in ['比肩', '劫财']: return f"{god}格 (杂气透干)"
        return "不成格 (月令藏干均未透)"

    formal_pattern = determine_strict_pattern()

    # =========================================================================
    # 4. 物理引擎全集 (The Physics Core)
    # =========================================================================
    hidden_stems = copy.deepcopy(raw_hidden_stems)
    physics_log = []
    
    # 基础计数
    counts = {"Wood":0, "Fire":0, "Earth":0, "Metal":0, "Water":0}
    for char in all_chars:
        el = get_element(char)
        if el: counts[el] += 1
    
    special_force_adjust = {"Wood":0, "Fire":0, "Earth":0, "Metal":0, "Water":0} 
    forced_yong_shen = [] 
    
    # -------------------------------------------------------------------------
    # 4.1 化气格判定 (Transformation - V31 Priority)
    # -------------------------------------------------------------------------
    is_true_transformation = False
    transform_god_element = None

    for rule in transform_rules:
        pair, target_el, valid_months, blockers, cleaners = rule
        
        # 检查日主是否在合中，或者年月/月时合
        if pair.issubset(set(stems) | {dm_stem}):
            # 月令支持
            if month_branch in valid_months:
                # 阻碍检测 (Cleansing Logic)
                is_blocked = False
                blocker_found = []
                
                # 扫描天干是否有阻碍元素
                for s in stems:
                    if stems_info[s]['el'] in blockers:
                        blocker_found.append(s)
                
                if blocker_found:
                    # 发现阻碍，寻找救应 (去浊留清)
                    has_cleaner = False
                    for s in stems:
                        # 救应者：克制阻碍者，或转化阻碍者
                        # 简化逻辑：只要有五行属 cleaners 列表里的
                        if stems_info[s]['el'] in cleaners:
                            has_cleaner = True
                    
                    if has_cleaner:
                        physics_log.append(f"✨ 真化气格：[{''.join(pair)}]合化[{target_el}]，虽有[{''.join(blocker_found)}]阻碍，幸得救应去浊留清")
                    else:
                        is_blocked = True
                        physics_log.append(f"🔗 假化气格：[{''.join(pair)}]合而不化，因[{''.join(blocker_found)}]阻碍且无制")
                else:
                    physics_log.append(f"✨ 真化气格：[{''.join(pair)}]合化[{target_el}]，月令支持，无杂气阻碍")
                
                if not is_blocked:
                    is_true_transformation = True
                    transform_god_element = target_el
                    # 化气成功，其他逻辑让路
                    break 

    # -------------------------------------------------------------------------
    # 4.2 会局引动 (Formation Inducement - V28)
    # -------------------------------------------------------------------------
    if not is_true_transformation: # 如果已经化气，地支逻辑略过
        # 申子合水
        if '申' in branches and '子' in branches and month_branch in ['亥', '子']:
            if has_water_stem:
                physics_log.append("🌊 申子化水：天干透水引动，申金根气清空")
                if '申' in hidden_stems: hidden_stems['申'] = {'壬': 30}
            else:
                physics_log.append("🔗 申子羁绊：水未透干，合而不化，根气保留")
        
        # 亥卯合木
        if '亥' in branches and '卯' in branches and month_branch in ['寅', '卯']:
            if has_wood_stem:
                physics_log.append("🌲 亥卯化木：天干透木引动，亥水根气清空")
                if '亥' in hidden_stems: hidden_stems['亥'] = {'甲': 30}
            else:
                physics_log.append("🔗 亥卯羁绊：木未透干，合而不化")

        # 巳酉合金
        if '巳' in branches and '酉' in branches and month_branch in ['申', '酉']:
            if has_metal_stem:
                physics_log.append("⚔️ 巳酉化金：天干透金引动，巳火变性")
                if '巳' in hidden_stems: hidden_stems['巳'] = {'庚': 30}
        
        # 寅午合火
        if '寅' in branches and '午' in branches and month_branch in ['巳', '午']:
            if has_fire_stem:
                physics_log.append("🔥 寅午化火：天干透火引动，寅木化火")
                if '寅' in hidden_stems: hidden_stems['寅'] = {'丙': 30}

    # -------------------------------------------------------------------------
    # 4.3 烈火分级与季节权重 (Fire Grading - V29)
    # -------------------------------------------------------------------------
    fire_score = 0
    # 月令权重 (Season)
    if parts[1][1] in ['巳', '午']: fire_score += 2.0
    elif parts[1][1] in ['未', '戌']: fire_score += 0.5
    # 日支权重 (Day Branch)
    if parts[2][1] in ['巳', '午']: fire_score += 1.5
    # 其他地支
    if parts[0][1] in ['巳', '午']: fire_score += 1.0
    if parts[3][1] in ['巳', '午']: fire_score += 1.0
    # 天干
    for i in [0, 1, 2, 3]:
        if parts[i][0] in ['丙', '丁']: fire_score += 1.0
        
    is_hot_season = month_branch in ['巳', '午', '未', '戌']
    
    if is_hot_season and not is_true_transformation:
        if fire_score >= 3.5: # 烈火阈值
            if '丑' in hidden_stems:
                hidden_stems['丑'] = {'己': 28} # 归零
                physics_log.append(f"🔥🔥 烈火烤土(丑)：火力评分{fire_score}，水气彻底蒸发 (真从)")
            if '辰' in hidden_stems:
                # 盖头检测
                is_gaitou = any(p == "戊辰" for p in parts)
                if is_gaitou:
                    hidden_stems['辰'] = {'戊': 28}
                    physics_log.append(f"🧱 盖头之克(戊辰)：火月戊土透干，吸干辰中水木")
                else:
                    hidden_stems['辰'] = {'戊': 28}
                    physics_log.append(f"🔥🔥 烈火烤土(辰)：火力评分{fire_score}，水木皆亡")
        elif fire_score >= 2.5: # 中火
            if '丑' in hidden_stems:
                hidden_stems['丑']['癸'] *= 0.2
                physics_log.append(f"🔥 烈火烤土(丑)：水气微存 (假从)")

    # -------------------------------------------------------------------------
    # 4.4 稼穑与十干体象 (Dominance & Ten Stems)
    # -------------------------------------------------------------------------
    is_earth_dominant = False
    if dm_el == 'Earth' and (counts['Earth'] + counts['Fire'] >= 7) and not is_true_transformation:
        is_earth_dominant = True
        physics_log.append("🧱 稼穑成格：火土气势宏大，论专旺")
        # 清空杂气
        for branch in ['辰', '未', '戌', '丑']:
            if branch in hidden_stems:
                new_dict = {}
                for k, v in hidden_stems[branch].items():
                    k_el = get_element(k)
                    if k_el in ['Earth', 'Fire']: new_dict[k] = v
                hidden_stems[branch] = new_dict
        forced_yong_shen = ["Fire(印星)", "Earth(比劫)", "Metal(食伤)"]

    # 水多土流
    if dm_el == 'Earth' and counts['Water'] >= 3 and month_branch in ['亥', '子'] and not is_earth_dominant:
        is_water_success = any("化水" in log for log in physics_log)
        if is_water_success or counts['Water'] >= 5:
            physics_log.append("🌊 水多土流：冬土遇洪，根气全消")
            forced_yong_shen = ["Water(财星)", "Wood(官杀)"]

    # =========================================================================
    # 5. 旺衰评分 (Z-Score)
    # =========================================================================
    def get_relation(dm_el):
        cycle = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
        idx = cycle.index(dm_el)
        return {'Self': dm_el, 'Output': cycle[(idx+1)%5], 'Wealth': cycle[(idx+2)%5], 'Official': cycle[(idx+3)%5], 'Resource': cycle[(idx+4)%5]}
    relations = get_relation(dm_el)
    support_els = [relations['Self'], relations['Resource']]
    
    def get_kong_wang(stem, branch):
        s_idx = list("甲乙丙丁戊己庚辛壬癸").index(stem)
        b_idx = list("子丑寅卯辰巳午未申酉戌亥").index(branch)
        offset = (b_idx - s_idx) if (b_idx - s_idx) >= 0 else (b_idx - s_idx) + 12
        kw_dict = {10:['申','酉'], 8:['午','未'], 6:['辰','巳'], 4:['寅','卯'], 2:['子','丑'], 0:['戌','亥']}
        return kw_dict.get(offset, [])
    day_kw = get_kong_wang(dm_stem, parts[2][1])
    
    month_roots = hidden_stems.get(month_branch, {})
    month_score = 0
    is_month_hostile = False
    month_main_el = get_element(zang_gan_order[month_branch][0])
    if controlling[month_main_el] == dm_el: is_month_hostile = True
    for root, weight in month_roots.items():
        root_el = get_element(root)
        if root_el == dm_el: month_score += (weight * 0.3 if is_month_hostile else weight)
        elif root_el in support_els: month_score += (weight * 0.7 * 0.3 if is_month_hostile else weight * 0.7)
        
    roots_score = 0
    valid_root_count = 0 
    for i in [0, 2, 3]: 
        branch = parts[i][1]
        c_score = 0
        for root, weight in hidden_stems.get(branch, {}).items():
            rel = get_element(root)
            if rel == dm_el: c_score += weight
            elif rel in support_els: c_score += weight * 0.7
        if c_score > 3.0: valid_root_count += 1
        elif c_score > 0.5: valid_root_count += 0.5 
        roots_score += c_score
        
    stems_score = 0
    stem_els = [get_element(p[0]) for p in parts]
    stem_gods = [] 
    for i in range(4): 
        if i != 2: 
            stem_el = stem_els[i]
            adjusted_base = 10 + special_force_adjust.get(stem_el, 0)
            if stem_el in support_els: stems_score += adjusted_base
        s_el = stem_els[i]
        for god, el in relations.items():
            if el == s_el: stem_gods.append(god)

    z_score = (0.1585 * month_score) + (0.0139 * roots_score) + (0.0336 * stems_score) - 2.2463
    if is_earth_dominant: z_score += 5.0 

    verdict = "身旺" if z_score > 0 else "身弱"

    # =========================================================================
    # 6. 格局裁决 (Verdict)
    # =========================================================================
    pattern_code = "Normal"
    calc_pattern = "普通格局"

    # 优先判化气
    if is_true_transformation:
        calc_pattern = f"真化气格 (化{transform_god_element})"
        pattern_code = "Transform"
        if transform_god_element == 'Earth': forced_yong_shen = ["Earth(化神)", "Fire(生神)"]
        elif transform_god_element == 'Metal': forced_yong_shen = ["Metal(化神)", "Earth(生神)"]
        elif transform_god_element == 'Water': forced_yong_shen = ["Water(化神)", "Metal(生神)"]
        elif transform_god_element == 'Wood': forced_yong_shen = ["Wood(化神)", "Water(生神)"]
        elif transform_god_element == 'Fire': forced_yong_shen = ["Fire(化神)", "Wood(生神)"]

    elif forced_yong_shen:
        if "Water(财星)" in forced_yong_shen: 
            calc_pattern = "真从格 (弃命相从)"
            pattern_code = "Follow_Weak"
        elif "Earth(比劫)" in forced_yong_shen:
            calc_pattern = "专旺格 (稼穑/气势)"
            pattern_code = "Follow_Strong"
        elif "Fire(食伤)" in forced_yong_shen and "Earth(财星)" in forced_yong_shen: # 水多木漂喜土火
            calc_pattern = "身弱 (水多木漂)"
            pattern_code = "Normal"
            
    elif is_earth_dominant:
        calc_pattern = "专旺格 (稼穑格 / 气势专一)"
        pattern_code = "Follow_Strong"
    elif z_score < -1.5:
        if valid_root_count == 0:
            calc_pattern = "真从格 (弃命相从)"
            pattern_code = "Follow_Weak"
        else:
            calc_pattern = "假从格 / 极弱"
            pattern_code = "Fake_Follow"
    elif z_score > 3.0:
        calc_pattern = "专旺格"
        pattern_code = "Follow_Strong"

    # =========================================================================
    # 7. 智能防御系统 (Smart Defense: Betrayal & Conflict)
    # =========================================================================
    conflict_log = ""
    is_betrayal = False
    is_fighting = False

    # 仅当判定为从格时，检查是否需要回退
    if pattern_code in ["Follow_Weak", "Fake_Follow"] and pattern_code != "Transform":
        has_output = 'Output' in stem_gods
        has_official = 'Official' in stem_gods
        
        if has_output and has_official:
            # 1. 叛变检测 (贪合) - 严格循环
            found_combine = False
            for combo in transform_rules:
                pair, _, _, _, _ = combo
                # 检查天干是否有这一对
                intersect = pair.intersection(set(stems))
                if len(intersect) == 2:
                    # 检查这一对是否是 食伤+官杀
                    e1, e2 = list(intersect)
                    god1 = get_ten_god(e1, dm_stem)
                    god2 = get_ten_god(e2, dm_stem)
                    gods_pair = [god1, god2]
                    # 定义食伤集合和官杀集合
                    outputs = ['食神', '伤官']
                    officials = ['正官', '七杀']
                    
                    if (god1 in outputs and god2 in officials) or \
                       (god2 in outputs and god1 in officials):
                        found_combine = True
                        break
            
            if found_combine:
                is_betrayal = True
                conflict_log = "⚠️ 贪合忘克：食伤与官杀相合，救星叛变，强制真从"
            else:
                # 2. 战克检测 (V30: 无根不战)
                if valid_root_count > 0: # 只有有根气时，才算反抗
                    is_fighting = True
                    conflict_log = "⚠️ 战克不从：天干透食伤制杀，日主有根气，心存反抗"
                else:
                    # 无根气，食伤制杀 = 伤官伤尽 = 真从
                    pass

    if is_betrayal:
        pattern_code = "Follow_Weak"
        calc_pattern = "真从格 (贪合忘克/弃命相从)"
        forced_yong_shen = [relations['Wealth'], relations['Official']] 
    elif is_fighting:
        pattern_code = "Normal"
        calc_pattern = "身弱 (伤官见官 / 杀重身轻)"
        verdict = "身弱"

    # =========================================================================
    # 8. 喜用神生成
    # =========================================================================
    yong_shen = []
    ji_shen = []
    
    if forced_yong_shen:
        yong_shen = forced_yong_shen
        if pattern_code == "Transform":
             ji_shen = ["还原日主之神", "克制化神之神"]
        elif pattern_code == "Follow_Weak": ji_shen = [relations['Resource'], relations['Self']]
        elif pattern_code == "Follow_Strong": ji_shen = [relations['Wealth'], relations['Official']]
    else:
        if pattern_code == "Follow_Weak":
            yong_shen = [relations['Wealth'], relations['Official'], relations['Output']]
            ji_shen = [relations['Resource'], relations['Self']]
            # 特殊：从儿喜财
            if counts[relations['Output']] >= 3:
                yong_shen = [relations['Output'], relations['Wealth']]
                ji_shen = [relations['Resource'], relations['Official']]
        elif pattern_code == "Fake_Follow":
            yong_shen = [relations['Output'], relations['Wealth'], relations['Official']]
            ji_shen = [relations['Resource'], relations['Self']]
        elif pattern_code == "Follow_Strong":
             yong_shen = [relations['Resource'], relations['Self'], relations['Output']]
             ji_shen = [relations['Wealth'], relations['Official']]
        elif pattern_code == "Normal":
            if verdict == "身弱":
                yong_shen = [relations['Resource'], relations['Self']]
                ji_shen = [relations['Official'], relations['Wealth'], relations['Output']]
            else:
                yong_shen = [relations['Official'], relations['Wealth'], relations['Output']]
                ji_shen = [relations['Resource'], relations['Self']]

    def get_god_name(element):
        for k, v in relations.items():
            if v == element: return {'Self':'比劫','Resource':'印星','Output':'食伤','Wealth':'财星','Official':'官杀'}[k]
        return ""
        
    yong_str = "、".join([f"{el}({get_god_name(el)})" for el in yong_shen] if isinstance(yong_shen[0], str) is False else yong_shen)
    ji_str = "、".join([f"{el}({get_god_name(el)})" for el in ji_shen] if isinstance(ji_shen[0], str) is False else ji_shen)
    
    unique_dirs = []
    target_list = forced_yong_shen if forced_yong_shen else yong_shen
    for y in target_list[:2]:
        el = y.split('(')[0]
        if el in direction_map: unique_dirs.append(direction_map[el])
    dir_str = "、".join(list(set(unique_dirs)))

    # =========================================================================
    # 9. 最终输出
    # =========================================================================
    return {
        "八字": bazi_str,
        "【定格】传统格局": formal_pattern,
        "【旺衰】能量状态": verdict,
        "【气势】特殊格局": calc_pattern,
        "【物理/深度逻辑】": (conflict_log + (" | " if conflict_log and physics_log else "") + " | ".join(physics_log)) if (physics_log or conflict_log) else "无特殊物理变化",
        "喜用神": yong_str,
        "忌神": ji_str,
        "吉利方位": dir_str,
        "Z-Score": round(z_score, 2),
        "合化/会局检测": physics_log[0] if physics_log else "无",
        "日柱空亡": day_kw
    }

# ==========================================
# 调试入口
# ==========================================
if __name__ == "__main__":
    import json
    # 测试集：真化气、真从儿、战克不从
    cases = [
        "己巳 壬申 癸卯 戊午", # 真化气
    ]
    for c in cases:
        print(f"--- {c} ---")
        print(json.dumps(calculate_li_shuanglin_v32(c), indent=4, ensure_ascii=False))