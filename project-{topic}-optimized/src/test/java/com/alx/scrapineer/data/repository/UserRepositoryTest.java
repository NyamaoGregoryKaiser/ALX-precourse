```java
package com.alx.scrapineer.data.repository;

import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Ensure a clean state before each test
        testUser = User.builder()
                .username("testuser")
                .password("encodedpassword")
                .roles(Set.of(Role.USER))
                .build();
        userRepository.save(testUser);
    }

    @Test
    void testFindByUsername_UserExists() {
        Optional<User> foundUser = userRepository.findByUsername(testUser.getUsername());

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo(testUser.getUsername());
        assertThat(foundUser.get().getRoles()).containsExactlyInAnyOrder(Role.USER);
    }

    @Test
    void testFindByUsername_UserDoesNotExist() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistentuser");

        assertThat(foundUser).isNotPresent();
    }

    @Test
    void testExistsByUsername_UserExists() {
        boolean exists = userRepository.existsByUsername(testUser.getUsername());

        assertThat(exists).isTrue();
    }

    @Test
    void testExistsByUsername_UserDoesNotExist() {
        boolean exists = userRepository.existsByUsername("nonexistentuser");

        assertThat(exists).isFalse();
    }

    @Test
    void testSaveUser_NewUser() {
        User newUser = User.builder()
                .username("newuser")
                .password("newencodedpassword")
                .roles(Set.of(Role.ADMIN, Role.USER))
                .build();
        User savedUser = userRepository.save(newUser);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("newuser");
        assertThat(savedUser.getRoles()).containsExactlyInAnyOrder(Role.ADMIN, Role.USER);
    }

    @Test
    void testUpdateUser() {
        testUser.setUsername("updateduser");
        testUser.getRoles().add(Role.ADMIN);
        User updatedUser = userRepository.save(testUser);

        assertThat(updatedUser.getUsername()).isEqualTo("updateduser");
        assertThat(updatedUser.getRoles()).containsExactlyInAnyOrder(Role.USER, Role.ADMIN);
    }

    @Test
    void testDeleteUser() {
        userRepository.delete(testUser);
        Optional<User> foundUser = userRepository.findByUsername(testUser.getUsername());

        assertThat(foundUser).isNotPresent();
    }
}
```