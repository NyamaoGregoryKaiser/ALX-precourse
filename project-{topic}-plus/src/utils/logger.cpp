// This file is mostly for ensuring Logger::init() is called if not done explicitly elsewhere.
// But as `Logger::init` is static and `getLogger` lazy-initializes,
// this file is not strictly necessary for simple cases unless you want to force
// a specific initialization point.
// For this project, the header-only approach with static inline members is sufficient.
```