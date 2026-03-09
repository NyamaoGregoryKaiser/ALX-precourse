```java
package com.alx.pms.task.repository;

import com.alx.pms.model.Project;
import com.alx.pms.model.Task;
import com.alx.pms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProject(Project project);
    List<Task> findByAssignedTo(User assignedTo);
    Optional<Task> findByIdAndProject_Owner(Long taskId, User owner); // Task must belong to a project owned by the user
}
```