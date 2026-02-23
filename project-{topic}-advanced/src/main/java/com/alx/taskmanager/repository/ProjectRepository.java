package com.alx.taskmanager.repository;

import com.alx.taskmanager.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    // Find projects by a user assigned to them
    @Query("SELECT p FROM Project p JOIN p.assignedUsers u WHERE u.id = :userId")
    List<Project> findByAssignedUsers_Id(Long userId);
}