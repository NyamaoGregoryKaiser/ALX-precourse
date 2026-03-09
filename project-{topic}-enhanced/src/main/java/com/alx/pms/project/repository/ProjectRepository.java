```java
package com.alx.pms.project.repository;

import com.alx.pms.model.Project;
import com.alx.pms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwner(User owner);
    Optional<Project> findByIdAndOwner(Long id, User owner);
}
```