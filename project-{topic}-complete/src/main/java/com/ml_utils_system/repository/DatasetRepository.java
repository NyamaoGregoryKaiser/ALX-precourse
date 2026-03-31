```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link Dataset} entities.
 * Provides standard CRUD operations and custom query methods for datasets.
 */
@Repository
public interface DatasetRepository extends JpaRepository<Dataset, Long> {

    /**
     * Finds a dataset by its unique name.
     *
     * @param name The name of the dataset.
     * @return An Optional containing the found Dataset, or empty if not found.
     */
    Optional<Dataset> findByName(String name);

    /**
     * Checks if a dataset with the given name exists.
     *
     * @param name The name of the dataset.
     * @return True if a dataset with the name exists, false otherwise.
     */
    boolean existsByName(String name);
}
```