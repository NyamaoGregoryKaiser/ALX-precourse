package com.ml_utilities_system.repository;

import com.ml_utilities_system.model.Feature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeatureRepository extends JpaRepository<Feature, Long> {
    Optional<Feature> findByNameAndVersion(String name, Integer version);
    boolean existsByNameAndVersion(String name, Integer version);
}