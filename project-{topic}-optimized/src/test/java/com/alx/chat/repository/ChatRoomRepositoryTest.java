```java
package com.alx.chat.repository;

import com.alx.chat.entity.ChatRoom;
import com.alx.chat.entity.RoomMember;
import com.alx.chat.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class ChatRoomRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    private ChatRoomRepository chatRoomRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;

    private User user1;
    private User user2;
    private ChatRoom room1;
    private ChatRoom room2;

    @BeforeEach
    void setUp() {
        user1 = new User(null, "user1", "user1@example.com", "pass1", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        user2 = new User(null, "user2", "user2@example.com", "pass2", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user1);
        userRepository.save(user2);

        room1 = new ChatRoom(null, "Public Room", LocalDateTime.now(), ChatRoom.ChatRoomType.PUBLIC, user1, null, null);
        room2 = new ChatRoom(null, "Private Room", LocalDateTime.now(), ChatRoom.ChatRoomType.PRIVATE, user2, null, null);
        chatRoomRepository.save(room1);
        chatRoomRepository.save(room2);

        roomMemberRepository.save(new RoomMember(user1, room1, LocalDateTime.now(), true));
        roomMemberRepository.save(new RoomMember(user2, room1, LocalDateTime.now(), false));
        roomMemberRepository.save(new RoomMember(user2, room2, LocalDateTime.now(), true));
    }

    @Test
    void findByName_shouldReturnChatRoom() {
        Optional<ChatRoom> found = chatRoomRepository.findByName("Public Room");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Public Room");
    }

    @Test
    void existsByName_shouldReturnTrue() {
        Boolean exists = chatRoomRepository.existsByName("Public Room");
        assertThat(exists).isTrue();
    }

    @Test
    void findByUserId_shouldReturnRoomsForUser() {
        List<ChatRoom> roomsForUser1 = chatRoomRepository.findByUserId(user1.getId());
        assertThat(roomsForUser1).hasSize(1);
        assertThat(roomsForUser1.get(0).getName()).isEqualTo("Public Room");

        List<ChatRoom> roomsForUser2 = chatRoomRepository.findByUserId(user2.getId());
        assertThat(roomsForUser2).hasSize(2);
        assertThat(roomsForUser2).extracting(ChatRoom::getName).containsExactlyInAnyOrder("Public Room", "Private Room");
    }
}
```