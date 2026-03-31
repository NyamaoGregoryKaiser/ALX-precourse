```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.FeatureDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

/**
 * Repository interface for {@link FeatureDefinition} entities.
 * Provides standard CRUD operations and custom query methods for feature definitions.
 */
@Repository
public interface FeatureDefinitionRepository extends JpaRepository<FeatureDefinition, Long> {

    /**
     * Finds a feature definition by its name and version.
     *
     * @param name    The name of the feature.
     * @param version The version of the feature definition.
     * @return An Optional containing the found FeatureDefinition, or empty if not found.
     */
    Optional<FeatureDefinition> findByNameAndVersion(String name, String version);

    /**
     * Checks if a feature definition with the given name and version exists.
     *
     * @param name    The name of the feature.
     * @param version The version of the feature definition.
     * @return True if a feature definition with the name and version exists, false otherwise.
     */
    boolean existsByNameAndVersion(String name, String version);

    /**
     * Finds all feature definitions associated with a specific dataset.
     *
     * @param datasetId The ID of the source dataset.
     * @return A list of FeatureDefinition objects.
     */
    List<FeatureDefinition> findBySourceDatasetId(Long datasetId);

    /**
     * Finds all feature definitions by their name.
     *
     * @param name The name of the feature definition.
     * @return A list of FeatureDefinition objects with the given name, potentially different versions.
     */
    List<FeatureDefinition> findByName(String name);
}
```