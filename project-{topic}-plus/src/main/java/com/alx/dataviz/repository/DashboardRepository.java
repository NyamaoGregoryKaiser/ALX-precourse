```java
package com.alx.dataviz.repository;

import com.alx.dataviz.model.Dashboard;
import com.alx.dataviz.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Dashboard, Long> {
    List<Dashboard> findByOwner(User owner);
}
```