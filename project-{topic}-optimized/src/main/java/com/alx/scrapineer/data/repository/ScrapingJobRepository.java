```java
package com.alx.scrapineer.data.repository;

import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScrapingJobRepository extends JpaRepository<ScrapingJob, Long> {
    List<ScrapingJob> findByUser(User user);
    Optional<ScrapingJob> findByIdAndUser(Long id, User user);

    List<ScrapingJob> findByStatusAndNextRunAtBefore(JobStatus status, LocalDateTime now);

    @Query("SELECT sj FROM ScrapingJob sj WHERE sj.status = 'SCHEDULED' AND sj.target.active = true AND sj.nextRunAt < :currentTime")
    List<ScrapingJob> findDueScheduledJobs(LocalDateTime currentTime);
}
```