package com.mlutil.ml_utilities_system.repository;

import com.mlutil.ml_utilities_system.model.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DatasetRepository extends JpaRepository<Dataset, UUID> {
    List<Dataset> findByOwnerUsername(String ownerUsername);
    Optional<Dataset> findByIdAndOwnerUsername(UUID id, String ownerUsername);
}