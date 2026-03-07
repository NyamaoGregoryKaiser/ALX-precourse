```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DatasetRepository extends JpaRepository<Dataset, Long> {
    Optional<Dataset> findByNameAndVersion(String name, String version);
    boolean existsByNameAndVersion(String name, String version);
}
```