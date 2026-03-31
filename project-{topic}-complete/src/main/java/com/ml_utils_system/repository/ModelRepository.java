```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link Model} entities.
 * Provides standard CRUD operations and custom query methods for ML models.
 */
@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {

    /**
     * Finds an ML model by its unique name.
     *
     * @param name The name of the model.
     * @return An Optional containing the found Model, or empty if not found.
     */
    Optional<Model> findByName(String name);

    /**
     * Checks if an ML model with the given name exists.
     *
     * @param name The name of the model.
     * @return True if a model with the name exists, false otherwise.
     */
    boolean existsByName(String name);
}
```