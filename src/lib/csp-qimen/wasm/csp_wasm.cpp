#include "csp_base.hpp"
#include "qmuse.h"
#include "qimen.h"
#include "zh_lang.h"
#include <emscripten/bind.h>
#include <nlohmann/json.hpp>
#include <string>
#include <cstdlib>

using namespace emscripten;
using json = nlohmann::json;

// emcc 6.x 打包的 libc++abi 不含 __cxa_throw 定义（默认 -fignore-exceptions 模式）。
// 内核仅在非法日期输入时抛异常；abort 与异常禁用模式下的默认语义一致。
extern "C" [[noreturn]] void __cxa_throw(void*, void*, void (*)(void*)) {
    std::abort();
}

// 结构化排盘：时间流程与 qmuse.cpp 保持一致，结果直接序列化 QimenData，
// 不经过任何 stdout 打印（上游 print.cpp 的排版变化不再影响数据消费方）。
// 字段语义对齐上游 print.cpp / jsonExport.cpp：
//   - 宫位下标 g=0..8，洛书宫位 pos = pos2gua[g] + 1（g=8 即中五宫）
//   - 天盘寄干：天芮所在宫追加 dp[8]（天禽寄天芮，寄干为中宫地盘干）
//   - 地盘寄干：坤二宫（默认寄宫 jigong）地盘追加 dp[8]
static std::string run_json_impl(const CmdParam& param)
{
    csp::DateTime dt{};
    if (!param.is_auto) {
        dt.year = param.year;
        dt.mon = param.mon;
        dt.day = param.day;
        dt.hour = param.hour;
        dt.min = param.min;
        dt.sec = param.sec;
    } else {
        dt = csp::Qimen::now_time();
    }

    if (param.type < 1 || param.type > 4) {
        return "";
    }
    if (param.zone != 0) {
        auto pt = tyme::SolarTime(dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
        pt = pt.next(param.zone * 3600);
        dt = csp::Qimen::solar(pt);
    }

    auto qm = csp::Qimen::instance(static_cast<csp::QimenType>(param.type));
    if (!qm || !qm->generate(dt, param.ju, param.angan)) {
        return "";
    }

    const auto qmd = qm->get_result();
    const auto& solar = csp::Qimen::solar(*qmd.dt_);
    const auto& gz = csp::Qimen::jiazi(*qmd.dt_);

    json j;
    j["kernel"] = CSP_VERSION;
    j["type"] = param.type;
    j["isYin"] = qmd.is_yin;
    j["yuan"] = qmd.yuan;   // -1 自动定局, 0 手动定局, 1 下元, 2 中元, 3 上元
    j["ju"] = qmd.ju;
    j["jieQi"] = csp::CZhData::jq(qmd.jieq);
    j["zhiFu"] = csp::CZhData::jx(qmd.jiuxp[qmd.duty]);
    j["zhiShi"] = csp::CZhData::bm(qmd.bamenp[qmd.duty]);
    j["wuBuYu"] = qmd.wubuyu;
    if (param.type == 2) {
        j["yueJiang"] = csp::CZhData::zhi(qmd.yuejiang_);
    }

    static const char* ganZhiNames[4] = {"year", "month", "day", "hour"};
    const int gzIndices[4] = {gz.yi, gz.mi, gz.di, gz.hi};
    for (int i = 0; i < 4; ++i) {
        j["siZhu"][ganZhiNames[i]] =
            csp::CZhData::gan(gzIndices[i] % 10) + csp::CZhData::zhi(gzIndices[i] % 12);
    }

    static const char* xunKongNames[4] = {"year", "month", "day", "hour"};
    for (int i = 0; i < 4; ++i) {
        j["xunKong"][xunKongNames[i]] =
            csp::CZhData::zhi(qmd.xunkong[i * 2]) + csp::CZhData::zhi(qmd.xunkong[i * 2 + 1]);
    }

    static const char* wuxingNames[] = {"", "金", "水", "木", "火", "土"};
    json palaces = json::array();
    for (int g = 0; g < 9; ++g) {
        json p;
        p["pos"] = qmd.pos2gua[g] + 1;
        p["wuXing"] = wuxingNames[qmd.wuxing[g]];
        p["isKong"] = (g == qmd.kongw[0] || g == qmd.kongw[1]);
        p["isMa"] = (g == qmd.maxing);
        if (g == 8) {
            // 中宫：无星无门无神无暗干，仅地盘干参与（天禽寄宫信息由寄干体现）
            p["xing"] = "";
            p["tianPan"] = "";
            p["tianPanJi"] = "";
            p["men"] = "";
            p["shen"] = "";
            p["anGan"] = "";
            p["diPan"] = csp::CZhData::gan(qmd.dp[g]);
            p["diPanJi"] = "";
        } else {
            p["xing"] = csp::CZhData::jx(qmd.jiuxr[g]);
            p["tianPan"] = csp::CZhData::gan(qmd.tp[g]);
            // 天禽随天芮寄宫：天芮当前所在宫的天盘追加中宫地盘干
            p["tianPanJi"] = (qmd.jiuxr[g] == qmd.jiuxp[qmd.jigong])
                                 ? csp::CZhData::gan(qmd.dp[8]) : "";
            p["men"] = csp::CZhData::bm(qmd.bamenr[g]);
            p["diPan"] = csp::CZhData::gan(qmd.dp[g]);
            // 默认寄宫（坤二宫）的地盘追加中宫地盘干
            p["diPanJi"] = (g == qmd.jigong) ? csp::CZhData::gan(qmd.dp[8]) : "";
            p["shen"] = csp::CZhData::bs(qmd.bashenr[g]);
            p["anGan"] = csp::CZhData::gan(qmd.angan[g]);
        }
        palaces.push_back(p);
    }
    j["palaces"] = palaces;
    return j.dump();
}

EMSCRIPTEN_BINDINGS(csp_module) {
    class_<CmdParam>("CmdParam")
        .constructor<>()
        .property("year", &CmdParam::year)
        .property("mon", &CmdParam::mon)
        .property("day", &CmdParam::day)
        .property("hour", &CmdParam::hour)
        .property("min", &CmdParam::min)
        .property("sec", &CmdParam::sec)
        .property("ju", &CmdParam::ju)
        .property("type", &CmdParam::type)
        .property("zone", &CmdParam::zone)
        .property("angan", &CmdParam::angan)
        .property("is_auto", &CmdParam::is_auto)
        .property("str_dt", &CmdParam::str_dt)
        ;

    emscripten::function("runJson", &run_json_impl);
}
