/**
 * constants - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - 无显式导出
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

export { TIAN_GAN, DI_ZHI } from '../../constants/ganZhi';

export {
    WU_XING,
    YUE_JIANG,
    WU_BU_YU_SHI,
    DI_ZHI_SHENG_XIAO,
    DI_ZHI_CHONG,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
    TIAN_GAN_YIN_YANG,
    DI_ZHI_CANG_GAN,
    NA_YIN,
    KONG_WANG,
    SHI_SHEN,
    SHI_ER_ZHANG_SHENG,
    WU_XING_WANG_SHUAI,
    ZI_REN_YUAN,
    WU_XING_FANG_WEI,
    JIAO_YUN_GAN,
    SHI_SHEN_XING_GE_FEN_XI,
} from './maps/baziJichuMap';

export {
    type ShiShenGroup,
    SHISHEN_GROUP_MAP,
    SHISHEN_SHENG,
    SHISHEN_KE,
    TIANGAN_HE,
    LIUTONG_COLORS,
} from './maps/shishenGroupMap';

export { DIAGRAM_LAYOUT } from './utils/diagramLayout';
