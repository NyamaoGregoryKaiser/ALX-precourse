#include "Logger.h"

std::shared_ptr<spdlog::logger> Logger::logger_;
bool Logger::initialized_ = false;