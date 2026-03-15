package com.ml_utilities_system.repository;

import com.ml_utilities_system.model.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {
    Optional<Model> findByNameAndVersion(String name, Integer version);
    List<Model> findByName(String name);
    boolean existsByNameAndVersion(String name, Integer version);
}