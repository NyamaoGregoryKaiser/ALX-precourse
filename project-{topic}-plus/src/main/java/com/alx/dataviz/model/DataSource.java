```java
package com.alx.dataviz.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Set;

@Entity
@Table(name = "data_source")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"charts"})
@ToString(exclude = {"charts"})
public class DataSource extends BaseEntity {

    public enum DataSourceType {
        CSV, DATABASE, API
    }

    @Column(nullable = false)
    private String name;

    @Column(length = 1000) // Increased length for connection details
    private String connectionDetails; // e.g., CSV path, DB connection string, API endpoint

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataSourceType type;

    @Column(columnDefinition = "TEXT")
    private String schemaDefinition; // JSON schema of the data

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @OneToMany(mappedBy = "dataSource", fetch = FetchType.LAZY)
    private Set<Chart> charts;
}
```