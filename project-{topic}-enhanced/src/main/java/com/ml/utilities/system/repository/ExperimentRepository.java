```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Experiment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExperimentRepository extends JpaRepository<Experiment, Long> {
    Optional<Experiment> findByName(String name);
    boolean existsByName(String name);
}
```