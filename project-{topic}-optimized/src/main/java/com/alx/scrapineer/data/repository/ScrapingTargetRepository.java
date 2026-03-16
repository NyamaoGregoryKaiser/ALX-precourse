```java
package com.alx.scrapineer.data.repository;

import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScrapingTargetRepository extends JpaRepository<ScrapingTarget, Long> {
    List<ScrapingTarget> findByUser(User user);
    Optional<ScrapingTarget> findByIdAndUser(Long id, User user);
    boolean existsByNameAndUser(String name, User user);
}
```