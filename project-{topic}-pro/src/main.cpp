```cpp
#include "app.h"
#include "common/logger.h"
#include <signal.h> // For signal handling

WebScraperApp* globalApp = nullptr;

void signalHandler(int signum) {
    Logger::critical("Main", "Interrupt signal ({}) received. Shutting down...", signum);
    if (globalApp) {
        globalApp->shutdown();
    }
    exit(signum);
}

int main(int argc, char *argv[]) {
    // Register signal handlers for graceful shutdown
    signal(SIGINT, signalHandler);  // Ctrl+C
    signal(SIGTERM, signalHandler); // kill command

    try {
        globalApp = new WebScraperApp();
        globalApp->run();

        // Keep main thread alive for graceful shutdown
        // Pistache's `serveThreaded` runs in background.
        // We need to block main thread or allow signal handler to trigger shutdown.
        // A simple loop waiting for shutdown state is common.
        // Since globalApp->shutdown() calls httpEndpoint->shutdown(),
        // the server threads will eventually exit.
        // For graceful exit, the signal handler is key.
        // In this setup, we rely on the signal handler to call `globalApp->shutdown()`
        // which then terminates the Pistache server threads.
        // The `main` function should then simply exit.

        // Loop here to keep main thread running, waiting for signal
        // This is a minimal way; a proper event loop or condition variable would be better.
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

    } catch (const std::exception& e) {
        Logger::critical("Main", "Application startup failed: {}", e.what());
        return 1;
    } catch (...) {
        Logger::critical("Main", "Unknown error during application startup.");
        return 1;
    }

    if (globalApp) {
        delete globalApp;
        globalApp = nullptr;
    }
    return 0;
}
```