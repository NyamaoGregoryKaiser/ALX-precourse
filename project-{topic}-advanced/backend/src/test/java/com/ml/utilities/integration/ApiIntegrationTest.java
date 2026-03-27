```java
package com.ml.utilities.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.MlUtilitiesSystemApplication;
import com.ml.utilities.dto.AuthRequest;
import com.ml.utilities.dto.AuthResponse;
import com.ml.utilities.dto.ModelDTO;
import com.ml.utilities.dto.ModelType;
import com.ml.utilities.dto.ModelVersionDTO;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = MlUtilitiesSystemApplication.class)
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ApiIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    @Container
    public static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"))
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpassword");

    @DynamicPropertySource
    static void dynamicProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "a_very_secret_key_that_is_at_least_32_characters_long_for_HS256");
        registry.add("jwt.expiration", () -> "3600000"); // 1 hour
        registry.add("inference.service.url", () -> "http://localhost:5001/predict"); // Assuming inference service is mocked or running separately
    }

    private static String adminToken;
    private static String userToken;
    private static Long modelId;
    private static Long modelVersionId;

    @BeforeEach
    void setUp() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;
    }

    @Test
    @Order(1)
    void testRegisterAdminAndLogin() {
        // Register admin user directly (via seed data from DataLoader) and login
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("admin");
        authRequest.setPassword("adminpass");

        AuthResponse authResponse = given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract().as(AuthResponse.class);

        adminToken = authResponse.getToken();
        assertNotNull(adminToken);

        // Register regular user and login
        authRequest.setUsername("user");
        authRequest.setPassword("userpass");

        authResponse = given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract().as(AuthResponse.class);

        userToken = authResponse.getToken();
        assertNotNull(userToken);
    }

    @Test
    @Order(2)
    void testCreateModel_asAdmin() {
        ModelDTO modelDTO = ModelDTO.builder()
                .name("SentimentAnalysisV2")
                .description("Advanced sentiment analysis model")
                .type(ModelType.CLASSIFICATION)
                .build();

        ModelDTO createdModel = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(modelDTO)
                .when()
                .post("/api/models")
                .then()
                .statusCode(201)
                .body("name", equalTo("SentimentAnalysisV2"))
                .extract().as(ModelDTO.class);

        modelId = createdModel.getId();
        assertNotNull(modelId);
    }

    @Test
    @Order(3)
    void testCreateModel_asUser_forbidden() {
        ModelDTO modelDTO = ModelDTO.builder()
                .name("FraudDetection")
                .description("Fraud detection model")
                .type(ModelType.CLASSIFICATION)
                .build();

        given()
                .header("Authorization", "Bearer " + userToken)
                .contentType(ContentType.JSON)
                .body(modelDTO)
                .when()
                .post("/api/models")
                .then()
                .statusCode(403); // Forbidden for regular user
    }

    @Test
    @Order(4)
    void testGetModels_asUser() {
        given()
                .header("Authorization", "Bearer " + userToken)
                .contentType(ContentType.JSON)
                .when()
                .get("/api/models")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(2)) // Includes seeded models
                .body("name", hasItems("SentimentAnalyzer", "HousingPricePredictor", "SentimentAnalysisV2"));
    }

    @Test
    @Order(5)
    void testAddModelVersion_asAdmin() {
        ModelVersionDTO versionDTO = ModelVersionDTO.builder()
                .versionNumber("1.0.0")
                .modelPath("/models/sentimentv2/1.0.0.pkl")
                .metadata("{\"accuracy\": 0.95}")
                .isDefault(true)
                .build();

        ModelVersionDTO createdVersion = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(versionDTO)
                .when()
                .post("/api/models/{modelId}/versions", modelId)
                .then()
                .statusCode(201)
                .body("versionNumber", equalTo("1.0.0"))
                .body("isDefault", is(true))
                .extract().as(ModelVersionDTO.class);

        modelVersionId = createdVersion.getId();
        assertNotNull(modelVersionId);
    }

    @Test
    @Order(6)
    void testPredictDefaultVersion_asUser() {
        Map<String, Object> inputData = Map.of("text", "This is a great product!", "value": 10.5);

        given()
                .header("Authorization", "Bearer " + userToken)
                .contentType(ContentType.JSON)
                .body(Map.of("inputData", inputData))
                .when()
                .post("/api/inference/{modelId}/predict", modelId)
                .then()
                .statusCode(200)
                .body("modelName", equalTo("SentimentAnalysisV2"))
                .body("versionNumber", equalTo("1.0.0"))
                .body("prediction", notNullValue())
                .body("prediction.text", equalTo("processed_This is a great product!"))
                .body("prediction.value", equalTo(21.0f)); // Python doubles the value
    }

    @Test
    @Order(7)
    void testPredictSpecificVersion_asUser() {
        // Assume another version is added (or use existing for another model)
        // For simplicity, we'll re-use modelId and modelVersionId and test the specific endpoint
        Map<String, Object> inputData = Map.of("text", "I am happy", "number": 5);

        given()
                .header("Authorization", "Bearer " + userToken)
                .contentType(ContentType.JSON)
                .body(Map.of("inputData", inputData))
                .when()
                .post("/api/inference/{modelId}/versions/{versionId}/predict", modelId, modelVersionId)
                .then()
                .statusCode(200)
                .body("modelName", equalTo("SentimentAnalysisV2"))
                .body("versionNumber", equalTo("1.0.0"))
                .body("prediction", notNullValue())
                .body("prediction.text", equalTo("processed_I am happy"))
                .body("prediction.number", equalTo(10.0f));
    }

    @Test
    @Order(8)
    void testUpdateModel_asAdmin() {
        ModelDTO updateDTO = ModelDTO.builder()
                .name("SentimentAnalysisV2-Updated")
                .description("Updated advanced sentiment analysis model")
                .type(ModelType.CLASSIFICATION)
                .build();

        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(updateDTO)
                .when()
                .put("/api/models/{id}", modelId)
                .then()
                .statusCode(200)
                .body("name", equalTo("SentimentAnalysisV2-Updated"));
    }

    @Test
    @Order(9)
    void testDeleteModel_asAdmin() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .delete("/api/models/{id}", modelId)
                .then()
                .statusCode(204); // No Content

        // Verify it's deleted
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/models/{id}", modelId)
                .then()
                .statusCode(404); // Not Found
    }
}
```