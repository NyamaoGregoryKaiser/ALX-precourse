package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Task;
import com.alx.taskmgr.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Task entity.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByAssignedToId(Long assignedToId);
    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);
}