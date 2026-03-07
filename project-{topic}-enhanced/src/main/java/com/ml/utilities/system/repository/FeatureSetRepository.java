```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.FeatureSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeatureSetRepository extends JpaRepository<FeatureSet, Long> {
    Optional<FeatureSet> findByNameAndVersion(String name, String version);
    boolean existsByNameAndVersion(String name, String version);
}
```