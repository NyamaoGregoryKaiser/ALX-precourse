#pragma once

#include <string>
#include <vector>
#include <optional>
#include <stdexcept>
#include "../models/team.h"
#include "../database/db_manager.h"

class TeamNotFoundException : public std::runtime_error {
public:
    explicit TeamNotFoundException(const std::string& msg) : std::runtime_error(msg) {}
};

class TeamService {
public:
    explicit TeamService(DbManager& db_manager);

    Team createTeam(Team& team);
    std::optional<Team> getTeamById(const std::string& id);
    std::vector<Team> getAllTeams();
    Team updateTeam(const std::string& id, const Team& team_updates);
    void deleteTeam(const std::string& id);

    void addMemberToTeam(const std::string& team_id, const std::string& user_id);
    void removeMemberFromTeam(const std::string& team_id, const std::string& user_id);
    std::vector<std::string> getTeamMembers(const std::string& team_id);
    bool isUserTeamMember(const std::string& team_id, const std::string& user_id);

private:
    DbManager& db_manager_;
};
```