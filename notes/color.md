玄枢录 - 明亮模式配色方案
设计理念
明亮模式延续"数字漆器"主题，采用米白、象牙白作为主背景，配以深色文字和温暖的金铜色点缀，营造典雅精致的亮色氛围。

完整颜色变量表
1. 基础颜色（Background & Foreground）
变量名	HSL值	16进制	颜色描述	用途
--background	42 30% 97%	#FAF8F5	象牙白背景	页面主背景
--foreground	220 15% 20%	#2B3038	深墨色文字	主要文字颜色
2. 卡片与弹窗（Card & Popover）
变量名	HSL值	16进制	颜色描述	用途
--card	0 0% 100%	#FFFFFF	纯白卡片	卡片背景
--card-foreground	220 15% 20%	#2B3038	深墨色	卡片文字
--popover	0 0% 100%	#FFFFFF	纯白弹窗	弹窗背景
--popover-foreground	220 15% 20%	#2B3038	深墨色	弹窗文字
3. 主色调（Primary）
变量名	HSL值	16进制	颜色描述	用途
--primary	37 45% 50%	#B8924A	深金铜色	按钮、链接、强调
--primary-foreground	0 0% 100%	#FFFFFF	纯白	主色按钮文字
4. 次要颜色（Secondary）
变量名	HSL值	16进制	颜色描述	用途
--secondary	42 20% 92%	#EBE8E2	浅灰米色	次要背景
--secondary-foreground	220 15% 20%	#2B3038	深墨色	次要文字
5. 柔和颜色（Muted）
变量名	HSL值	16进制	颜色描述	用途
--muted	42 20% 92%	#EBE8E2	浅灰米色	禁用背景
--muted-foreground	220 10% 50%	#73777F	中灰色	次要文字、标签
6. 强调色（Accent）
变量名	HSL值	16进制	颜色描述	用途
--accent	160 35% 45%	#4A9382	深玉绿色	强调元素
--accent-foreground	0 0% 100%	#FFFFFF	纯白	强调文字
7. 警告色（Destructive）
变量名	HSL值	16进制	颜色描述	用途
--destructive	4 65% 55%	#D94F49	朱砂红	删除、警告
--destructive-foreground	0 0% 100%	#FFFFFF	纯白	警告文字
8. 边框与输入（Border & Input）
变量名	HSL值	16进制	颜色描述	用途
--border	42 15% 85%	#D9D5CC	浅棕灰边框	分隔线、边框
--input	42 15% 85%	#D9D5CC	浅棕灰	输入框边框
--ring	37 45% 50%	#B8924A	深金铜色	焦点环
9. 图表颜色（Chart Colors）
变量名	HSL值	16进制	颜色描述
--chart-1	37 45% 50%	#B8924A	深金色
--chart-2	160 35% 45%	#4A9382	深玉绿
--chart-3	4 65% 55%	#D94F49	朱砂红
--chart-4	200 45% 50%	#468CB3	湖蓝色
--chart-5	35 55% 50%	#C88B39	土黄色
10. 侧边栏（Sidebar）
变量名	HSL值	16进制	颜色描述	用途
--sidebar	42 25% 95%	#F5F2ED	极浅米色	侧边栏背景
--sidebar-foreground	220 15% 20%	#2B3038	深墨色	侧边栏文字
--sidebar-primary	37 45% 50%	#B8924A	深金铜色	侧边栏主色
--sidebar-primary-foreground	0 0% 100%	#FFFFFF	纯白	主色文字
--sidebar-accent	42 20% 90%	#E7E3DA	浅米灰	悬停背景
--sidebar-accent-foreground	220 15% 20%	#2B3038	深墨色	悬停文字
--sidebar-border	42 15% 88%	#DED9D0	浅棕边框	侧边栏边框
--sidebar-ring	37 45% 50%	#B8924A	深金铜色	焦点环
五行专用颜色（明亮模式）
五行	变量名	16进制	颜色描述
木	element-wood	#16A34A	深绿色
火	element-fire	#DC2626	深红色
土	element-earth	#B45309	深橙棕色
金	element-metal	#A67C2A	深古金色
水	element-water	#2563EB	深蓝色
奇门遁甲专用颜色（明亮模式）
元素	变量名	16进制	颜色描述
八门	qimen-men	#DC2626	深红色
九星	qimen-xing	#16A34A	深绿色
八神	qimen-shen	#B45309	深橙棕色
天干	qimen-gan	#2563EB	深蓝色
高亮	qimen-highlight	#A67C2A	深古金色
阴影系统（明亮模式）
变量名	值	用途
--shadow-2xs	0 1px 2px rgba(0,0,0,0.05)	超细微阴影
--shadow-xs	0 1px 3px rgba(0,0,0,0.08)	细微阴影
--shadow-sm	0 2px 4px rgba(0,0,0,0.1)	小阴影
--shadow	0 4px 6px rgba(0,0,0,0.1)	标准阴影
--shadow-md	0 6px 10px rgba(0,0,0,0.12)	中等阴影
--shadow-lg	0 10px 20px rgba(0,0,0,0.15)	大阴影
--shadow-xl	0 15px 30px rgba(0,0,0,0.18)	超大阴影
--shadow-2xl	0 25px 50px rgba(0,0,0,0.25)	巨大阴影

CSS实现代码
:root.light {
    /* 基础颜色 */
    --background: 42 30% 97%; /* #FAF8F5 象牙白 */
    --foreground: 220 15% 20%; /* #2B3038 深墨色 */
    
    /* 卡片 */
    --card: 0 0% 100%; /* #FFFFFF 纯白 */
    --card-foreground: 220 15% 20%;
    
    /* 弹窗 */
    --popover: 0 0% 100%;
    --popover-foreground: 220 15% 20%;
    
    /* 主色调 */
    --primary: 37 45% 50%; /* #B8924A 深金铜色 */
    --primary-foreground: 0 0% 100%;
    
    /* 次要颜色 */
    --secondary: 42 20% 92%; /* #EBE8E2 浅灰米色 */
    --secondary-foreground: 220 15% 20%;
    
    /* 柔和颜色 */
    --muted: 42 20% 92%;
    --muted-foreground: 220 10% 50%; /* #73777F 中灰色 */
    
    /* 强调色 */
    --accent: 160 35% 45%; /* #4A9382 深玉绿 */
    --accent-foreground: 0 0% 100%;
    
    /* 警告色 */
    --destructive: 4 65% 55%; /* #D94F49 朱砂红 */
    --destructive-foreground: 0 0% 100%;
    
    /* 边框 */
    --border: 42 15% 85%; /* #D9D5CC 浅棕灰 */
    --input: 42 15% 85%;
    --ring: 37 45% 50%;
    
    /* 图表 */
    --chart-1: 37 45% 50%;
    --chart-2: 160 35% 45%;
    --chart-3: 4 65% 55%;
    --chart-4: 200 45% 50%;
    --chart-5: 35 55% 50%;
    
    /* 侧边栏 */
    --sidebar: 42 25% 95%; /* #F5F2ED 极浅米色 */
    --sidebar-foreground: 220 15% 20%;
    --sidebar-primary: 37 45% 50%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 42 20% 90%;
    --sidebar-accent-foreground: 220 15% 20%;
    --sidebar-border: 42 15% 88%;
    --sidebar-ring: 37 45% 50%;
    
    /* 阴影 */
    --shadow-2xs: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-xs: 0 1px 3px rgba(0,0,0,0.08);
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
    --shadow: 0 4px 6px rgba(0,0,0,0.1);
    --shadow-md: 0 6px 10px rgba(0,0,0,0.12);
    --shadow-lg: 0 10px 20px rgba(0,0,0,0.15);
    --shadow-xl: 0 15px 30px rgba(0,0,0,0.18);
    --shadow-2xl: 0 25px 50px rgba(0,0,0,0.25);
}