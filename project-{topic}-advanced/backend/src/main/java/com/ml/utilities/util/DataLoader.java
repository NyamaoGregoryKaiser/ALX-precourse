```java
package com.ml.utilities.util;

import com.ml.utilities.entity.Model;
import com.ml.utilities.entity.ModelType;
import com.ml.utilities.entity.ModelVersion;
import com.ml.utilities.entity.User;
import com.ml.utilities.repository.ModelRepository;
import com.ml.utilities.repository.ModelVersionRepository;
import com.ml.utilities.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ModelRepository modelRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Loading initial data...");

        // Create Admin User if not exists
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("adminpass"))
                    .roles(Set.of("ROLE_USER", "ROLE_ADMIN"))
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            log.info("Created admin user: admin/adminpass");
        }

        // Create Regular User if not exists
        if (userRepository.findByUsername("user").isEmpty()) {
            User user = User.builder()
                    .username("user")
                    .password(passwordEncoder.encode("userpass"))
                    .roles(Set.of("ROLE_USER"))
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            userRepository.save(user);
            log.info("Created regular user: user/userpass");
        }

        // Create Dummy Models and Versions if not exists
        if (modelRepository.count() == 0) {
            Model sentimentModel = Model.builder()
                    .name("SentimentAnalyzer")
                    .description("Model for analyzing sentiment of text")
                    .type(ModelType.CLASSIFICATION)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            sentimentModel = modelRepository.save(sentimentModel);

            ModelVersion sentimentV1 = ModelVersion.builder()
                    .model(sentimentModel)
                    .versionNumber("1.0.0")
                    .modelPath("/models/sentiment/v1/sentiment_model.pkl")
                    .metadata("{\"input_features\": [\"text\"], \"output_classes\": [\"positive\", \"negative\", \"neutral\"]}")
                    .isDefault(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            modelVersionRepository.save(sentimentV1);

            ModelVersion sentimentV2 = ModelVersion.builder()
                    .model(sentimentModel)
                    .versionNumber("1.0.1")
                    .modelPath("/models/sentiment/v2/sentiment_model_v2.pkl")
                    .metadata("{\"input_features\": [\"text\"], \"output_classes\": [\"positive\", \"negative\", \"neutral\"], \"accuracy\": 0.92}")
                    .isDefault(false)
                    .createdAt(LocalDateTime.now().plusHours(1)) // Ensure later timestamp
                    .updatedAt(LocalDateTime.now().plusHours(1))
                    .build();
            modelVersionRepository.save(sentimentV2);

            log.info("Created SentimentAnalyzer model with versions 1.0.0 (default) and 1.0.1");

            Model housingPriceModel = Model.builder()
                    .name("HousingPricePredictor")
                    .description("Model for predicting housing prices based on features")
                    .type(ModelType.REGRESSION)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            housingPriceModel = modelRepository.save(housingPriceModel);

            ModelVersion housingV1 = ModelVersion.builder()
                    .model(housingPriceModel)
                    .versionNumber("1.0.0")
                    .modelPath("/models/housing/v1/housing_price_model.pkl")
                    .metadata("{\"input_features\": [\"sq_ft\", \"beds\", \"baths\"], \"output_unit\": \"USD\"}")
                    .isDefault(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            modelVersionRepository.save(housingV1);

            log.info("Created HousingPricePredictor model with version 1.0.0 (default)");
        }
        log.info("Initial data loading complete.");
    }
}
```