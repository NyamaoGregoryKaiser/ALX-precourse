```cpp
// src/utils/logger.cpp
// This file is empty because the Logger class is a header-only singleton
// using a static member variable definition.
// The instance definition `std::shared_ptr<spdlog::logger> Logger::instance = nullptr;`
// is correctly placed in the header, which is fine for modern C++ with singletons.
// If there were complex functions to implement, they would go here.
```