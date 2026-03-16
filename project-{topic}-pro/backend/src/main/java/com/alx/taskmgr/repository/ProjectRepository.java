package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Project entity.
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerId(Long ownerId);
    List<Project> findByCollaborators_Id(Long userId);
    List<Project> findByOwnerIdOrCollaborators_Id(Long ownerId, Long collaboratorId);
}