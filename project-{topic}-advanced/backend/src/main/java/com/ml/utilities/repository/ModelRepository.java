```java
package com.ml.utilities.repository;

import com.ml.utilities.entity.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.Cacheable;
import java.util.Optional;

public interface ModelRepository extends JpaRepository<Model, Long> {
    Optional<Model> findByName(String name);

    // Cacheable for frequent lookups of models
    @Cacheable(value = "models", key = "#id")
    Optional<Model> findById(Long id);
}
```