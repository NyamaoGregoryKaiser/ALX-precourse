```java
package com.alx.scrapineer.data.repository;

import com.alx.scrapineer.data.entity.ScrapingResult;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScrapingResultRepository extends JpaRepository<ScrapingResult, Long> {
    List<ScrapingResult> findByJobIdAndTargetUser(Long jobId, User user);
    Page<ScrapingResult> findByJobIdAndTargetUser(Long jobId, User user, Pageable pageable);
    Page<ScrapingResult> findByTargetIdAndTargetUser(Long targetId, User user, Pageable pageable);
}
```