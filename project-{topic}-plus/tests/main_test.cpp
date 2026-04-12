#include <gtest/gtest.h>

// This is the main entry point for all Google Test suites.
int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
```