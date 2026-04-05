```cpp
#ifndef GLOBAL_INIT_PLUGIN_H
#define GLOBAL_INIT_PLUGIN_H

#include <drogon/plugins/Plugin.h>
#include "config/ConfigLoader.h"
#include <iostream>

/**
 * @brief A Drogon plugin for performing global application initialization tasks.
 *
 * This plugin runs once during application startup. It's ideal for tasks like
 * loading environment variables, setting up custom loggers, or performing
 * any one-time setup that doesn't fit naturally into main.cc or a controller.
 */
class GlobalInitPlugin : public drogon::Plugin<GlobalInitPlugin> {
public:
    GlobalInitPlugin() {}

    /**
     * @brief Called once when the plugin is initialized.
     *        This happens before the HTTP server starts listening.
     */
    void initAndStart() override {
        // Load environment variables from .env file.
        // This ensures that placeholders in config.json (like ${DATABASE_HOST})
        // can be resolved by Drogon if not already set as system env vars.
        // In a Docker environment, system env vars are usually set directly,
        // making this less critical, but it's good for local development.
        ConfigLoader::loadEnv("backend/.env"); // Adjust path as necessary relative to executable run dir

        LOG_INFO << "GlobalInitPlugin initialized: Environment variables loaded.";
        // Example: Print some loaded env vars (for debugging)
        LOG_DEBUG << "Loaded DB Host: " << ConfigLoader::getEnv("DATABASE_HOST");
        LOG_DEBUG << "Loaded JWT Secret (first 5 chars): " << ConfigLoader::getEnv("JWT_SECRET").substr(0, 5) << "...";

        // Perform any other global setup tasks here
        // e.g., register custom error handlers, configure database clients further, etc.
    }

    /**
     * @brief Called once when the plugin is about to be shut down.
     *        This happens before the HTTP server stops.
     */
    void shutdown() override {
        LOG_INFO << "GlobalInitPlugin shut down.";
    }
};

#endif // GLOBAL_INIT_PLUGIN_H
```