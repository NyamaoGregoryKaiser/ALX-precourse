```java
package com.ml.utilities.repository;

import com.ml.utilities.entity.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.Cacheable;
import java.util.List;
import java.util.Optional;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {
    List<ModelVersion> findByModelId(Long modelId);
    Optional<ModelVersion> findByModelIdAndIsDefaultTrue(Long modelId);

    // Cacheable for frequent lookups of model versions
    @Cacheable(value = "modelVersions", key = "{#modelId, #versionNumber}")
    Optional<ModelVersion> findByModelIdAndVersionNumber(Long modelId, String versionNumber);

    // For specific version by ID
    @Cacheable(value = "modelVersions", key = "#id")
    Optional<ModelVersion> findById(Long id);
}
```