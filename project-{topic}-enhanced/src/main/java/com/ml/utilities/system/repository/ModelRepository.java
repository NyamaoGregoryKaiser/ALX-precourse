```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {
    Optional<Model> findByNameAndVersion(String name, String version);
    boolean existsByNameAndVersion(String name, String version);
}
```