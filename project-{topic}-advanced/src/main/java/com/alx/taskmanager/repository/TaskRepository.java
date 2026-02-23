package com.alx.taskmanager.repository;

import com.alx.taskmanager.model.Task;
import com.alx.taskmanager.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByAssigneeId(Long assigneeId);
    List<Task> findByReporterId(Long reporterId);
    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);
}