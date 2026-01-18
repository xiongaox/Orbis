#include "csp_base.hpp"
#include "qmuse.h"
#include <emscripten/bind.h>
#include <string>
#include <iostream>
#include <sstream>

using namespace emscripten;

// Helper function to capture stdout from CQimenUse::run
std::string run_captured(CQimenUse& qm, CmdParam& param) {
    // Save old buffer
    std::streambuf* old_cout_buf = std::cout.rdbuf();
    
    std::stringstream ss;
    std::cout.rdbuf(ss.rdbuf()); // Redirect cout to ss
    
    try {
        qm.run(param);
    } catch (...) {
        std::cout.rdbuf(old_cout_buf); // Restore if error
        throw;
    }
    
    std::cout.rdbuf(old_cout_buf); // Restore
    return ss.str();
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
        .property("is_auto", &CmdParam::is_auto)
        .property("str_dt", &CmdParam::str_dt)
        ;

    class_<CQimenUse>("CQimenUse")
        .constructor<>()
        .function("run", &CQimenUse::run)
        .function("run_captured", &run_captured)
        ;
}
