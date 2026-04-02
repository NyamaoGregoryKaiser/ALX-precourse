```java
package com.alx.cms.content.repository;

import com.alx.cms.content.model.Content;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContentRepository extends JpaRepository<Content, Long> {
    Optional<Content> findBySlug(String slug);
    Page<Content> findByPublishedTrue(Pageable pageable);
    Page<Content> findByAuthorId(Long authorId, Pageable pageable);
    Page<Content> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Content> findByTags_Id(Long tagId, Pageable pageable); // Find content by tag ID
}
```