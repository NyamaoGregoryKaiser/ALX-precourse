#pragma once

#include "crow.h"
#include "services/ScrapingService.h"
#include "middleware/AuthMiddleware.h" // For AuthRequestContext
#include "utils/JsonUtils.h"
#include "utils/Logger.h"

namespace { // Anonymous namespace for helper functions
    crow::json::wvalue job_to_json(const ScrapeJob& job) {
        crow::json::wvalue j;
        j["id"] = job.id;
        j["user_id"] = job.user_id;
        j["name"] = job.name;
        j["target_url"] = job.target_url;
        j["cron_schedule"] = job.cron_schedule;
        j["status"] = scrape_job_status_to_string(job.status);
        if (job.last_error) {
            j["last_error"] = job.last_error.value();
        }
        j["created_at"] = JsonUtils::format_time(job.created_at);
        j["updated_at"] = JsonUtils::format_time(job.updated_at);
        if (job.last_run_at) {
            j["last_run_at"] = JsonUtils::format_time(job.last_run_at.value());
        }
        if (job.next_run_at) {
            j["next_run_at"] = JsonUtils::format_time(job.next_run_at.value());
        }
        crow::json::wvalue::list selectors_json;
        for (const auto& sel : job.selectors) {
            crow::json::wvalue s;
            s["key"] = sel.first;
            s["selector"] = sel.second;
            selectors_json.push_back(std::move(s));
        }
        j["selectors"] = std::move(selectors_json);
        return j;
    }

    // Helper to parse JSON to ScrapeJob (for creation/update)
    std::optional<ScrapeJob> json_to_job(const crow::json::rvalue& json, int user_id_override = -1) {
        if (!json.has("name") || !json.has("target_url") || !json.has("selectors")) {
            LOG_WARN("Missing required fields for ScrapeJob from JSON.");
            return std::nullopt;
        }

        ScrapeJob job;
        job.user_id = (user_id_override != -1) ? user_id_override : 0; // If user_id_override provided, use it
        job.name = json["name"].s();
        job.target_url = json["target_url"].s();
        job.cron_schedule = json.has("cron_schedule") ? json["cron_schedule"].s() : "manual";
        job.status = ScrapeJobStatus::PENDING; // Always start as pending
        job.created_at = std::chrono::system_clock::now();
        job.updated_at = job.created_at;

        if (json["selectors"].t() == crow::json::type::List) {
            for (const auto& sel_json : json["selectors"]) {
                if (sel_json.has("key") && sel_json.has("selector")) {
                    job.selectors.push_back({sel_json["key"].s(), sel_json["selector"].s()});
                } else {
                    LOG_WARN("Invalid selector format in JSON.");
                    return std::nullopt;
                }
            }
        } else {
            LOG_WARN("Selectors field is not a list in JSON.");
            return std::nullopt;
        }
        return job;
    }
} // End anonymous namespace


class ScrapeJobController {
public:
    static void register_routes(crow::App<
            crow::AuthMiddleware,
            crow::ErrorMiddleware,
            crow::RateLimitMiddleware
        >& app, ScrapingService& scraping_service) {

        // Create a new ScrapeJob
        CROW_ROUTE(app, "/api/jobs").methods("POST"_method)
            ([&scraping_service](const crow::request& req, crow::AuthRequestContext& ctx) {
            if (!ctx.user_token) {
                return crow::response(401); // Unauthorized, middleware should catch this
            }
            if (ctx.user_token->role != user_role_to_string(UserRole::ADMIN) &&
                ctx.user_token->role != user_role_to_string(UserRole::USER)) {
                return crow::response(403, "{\"error\":\"Forbidden: Insufficient permissions.\"}");
            }

            crow::json::rvalue req_body = crow::json::load(req.body);
            if (!req_body) {
                return crow::response(400, "{\"error\":\"Invalid JSON body.\"}");
            }

            auto job_opt = json_to_job(req_body, ctx.user_token->user_id);
            if (!job_opt) {
                return crow::response(400, "{\"error\":\"Invalid job data provided.\"}");
            }

            auto new_job_opt = scraping_service.create_job(job_opt.value());
            if (new_job_opt) {
                return crow::response(201, job_to_json(new_job_opt.value()));
            } else {
                return crow::response(500, "{\"error\":\"Failed to create scrape job.\"}");
            }
        });

        // Get all ScrapeJobs for the authenticated user
        CROW_ROUTE(app, "/api/jobs").methods("GET"_method)
            ([&scraping_service](const crow::request& req, crow::AuthRequestContext& ctx) {
            if (!ctx.user_token) {
                return crow::response(401);
            }

            std::vector<ScrapeJob> jobs = scraping_service.get_all_jobs(ctx.user_token->user_id);
            crow::json::wvalue::list jobs_json;
            for (const auto& job : jobs) {
                jobs_json.push_back(job_to_json(job));
            }
            return crow::response(200, jobs_json);
        });

        // Get a specific ScrapeJob by ID
        CROW_ROUTE(app, "/api/jobs/<int>").methods("GET"_method)
            ([&scraping_service](const crow::request& req, crow::response& res, crow::AuthRequestContext& ctx, int job_id) {
            if (!ctx.user_token) {
                res.code = 401; res.write("{\"error\":\"Unauthorized\"}"); return;
            }

            auto job_opt = scraping_service.get_job(job_id, ctx.user_token->user_id);
            if (job_opt) {
                res.code = 200; res.write(job_to_json(job_opt.value()).dump());
            } else {
                res.code = 404; res.write("{\"error\":\"Scrape job not found or unauthorized.\"}");
            }
            res.end();
        });

        // Update a ScrapeJob
        CROW_ROUTE(app, "/api/jobs/<int>").methods("PUT"_method)
            ([&scraping_service](const crow::request& req, crow::AuthRequestContext& ctx, int job_id) {
            if (!ctx.user_token) {
                return crow::response(401);
            }
             if (ctx.user_token->role != user_role_to_string(UserRole::ADMIN) &&
                ctx.user_token->role != user_role_to_string(UserRole::USER)) {
                return crow::response(403, "{\"error\":\"Forbidden: Insufficient permissions.\"}");
            }

            crow::json::rvalue req_body = crow::json::load(req.body);
            if (!req_body) {
                return crow::response(400, "{\"error\":\"Invalid JSON body.\"}");
            }

            auto job_opt = json_to_job(req_body, ctx.user_token->user_id);
            if (!job_opt) {
                return crow::response(400, "{\"error\":\"Invalid job data provided for update.\"}");
            }
            job_opt->id = job_id; // Ensure the ID from URL is used
            job_opt->updated_at = std::chrono::system_clock::now(); // Update timestamp

            // Preserve original status if not explicitly provided, or ensure it's valid
            auto existing_job_opt = scraping_service.get_job(job_id, ctx.user_token->user_id);
            if (existing_job_opt) {
                job_opt->status = existing_job_opt->status; // Keep existing status if not changed
                if (req_body.has("status")) {
                    std::string new_status_str = req_body["status"].s();
                    if (auto new_status = string_to_scrape_job_status(new_status_str)) {
                        job_opt->status = new_status.value();
                    } else {
                        return crow::response(400, "{\"error\":\"Invalid status value.\"}");
                    }
                }
            } else {
                return crow::response(404, "{\"error\":\"Scrape job not found or unauthorized.\"}");
            }


            if (scraping_service.update_job(job_opt.value(), ctx.user_token->user_id)) {
                auto updated_job_opt = scraping_service.get_job(job_id, ctx.user_token->user_id);
                 if (updated_job_opt) {
                     return crow::response(200, job_to_json(updated_job_opt.value()));
                 } else {
                     return crow::response(500, "{\"error\":\"Job updated but failed to retrieve.\"}");
                 }
            } else {
                return crow::response(500, "{\"error\":\"Failed to update scrape job.\"}");
            }
        });

        // Delete a ScrapeJob
        CROW_ROUTE(app, "/api/jobs/<int>").methods("DELETE"_method)
            ([&scraping_service](const crow::request& req, crow::AuthRequestContext& ctx, int job_id) {
            if (!ctx.user_token) {
                return crow::response(401);
            }
             if (ctx.user_token->role != user_role_to_string(UserRole::ADMIN) &&
                ctx.user_token->role != user_role_to_string(UserRole::USER)) {
                return crow::response(403, "{\"error\":\"Forbidden: Insufficient permissions.\"}");
            }

            if (scraping_service.delete_job(job_id, ctx.user_token->user_id)) {
                return crow::response(204); // No Content
            } else {
                return crow::response(404, "{\"error\":\"Scrape job not found or unauthorized.\"}");
            }
        });

        // Manually trigger a ScrapeJob
        CROW_ROUTE(app, "/api/jobs/<int>/scrape").methods("POST"_method)
            ([&scraping_service](const crow::request& req, crow::AuthRequestContext& ctx, int job_id) {
            if (!ctx.user_token) {
                return crow::response(401);
            }
             if (ctx.user_token->role != user_role_to_string(UserRole::ADMIN) &&
                ctx.user_token->role != user_role_to_string(UserRole::USER)) {
                return crow::response(403, "{\"error\":\"Forbidden: Insufficient permissions.\"}");
            }

            // Check if job exists and belongs to user first
            auto job_opt = scraping_service.get_job(job_id, ctx.user_token->user_id);
            if (!job_opt) {
                return crow::response(404, "{\"error\":\"Scrape job not found or unauthorized.\"}");
            }

            // Trigger scrape in background
            std::future<bool> scrape_future = scraping_service.trigger_scrape(job_id);

            // Respond immediately, client can check job status later
            crow::json::wvalue res_body;
            res_body["message"] = "Scrape job triggered successfully. Check job status for results.";
            res_body["job_id"] = job_id;
            return crow::response(202, res_body); // Accepted
        });
    }
};