```java
package com.alx.ecommerce.mapper;

import com.alx.ecommerce.dto.CategoryDTO;
import com.alx.ecommerce.dto.ProductDTOs;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProductMapper {

    @Mapping(source = "category", target = "category")
    ProductDTOs.ProductResponse toProductResponse(Product product);

    @Mapping(source = "id", target = "id") // Map category ID
    CategoryDTO toCategoryDTO(Category category);

    // Map create request to Product entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "category", ignore = true) // Category is set by service based on categoryId
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Product toProduct(ProductDTOs.CreateProductRequest dto);

    // Update Product entity from DTO
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "category", ignore = true) // Category is set by service based on categoryId
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateProductFromDto(ProductDTOs.UpdateProductRequest dto, @MappingTarget Product product);
}
```