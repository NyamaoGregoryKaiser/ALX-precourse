#pragma once
#include <string>
#include <unordered_map>
#include <stdexcept>
#include "spdlog/spdlog.h"

class Config {
public:
    static void load_env(const std::string& filepath = ".env");
    static std::string get_string(const std::string& key, const std::string& default_value = "");
    static int get_int(const std::string& key, int default_value = 0);
    static bool get_bool(const std::string& key, bool default_value = false);

private:
    static std::unordered_map<std::string, std::string> env_vars;
    static bool is_loaded;
};