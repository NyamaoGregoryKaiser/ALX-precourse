package com.alxchat.repository;

import com.alxchat.model.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByName(String name);

    @Query("SELECT cr FROM ChatRoom cr LEFT JOIN FETCH cr.participants p WHERE p.user.id = :userId")
    List<ChatRoom> findByParticipantUserId(Long userId);

    @Query("SELECT cr FROM ChatRoom cr LEFT JOIN FETCH cr.participants p LEFT JOIN FETCH p.user WHERE cr.id = :roomId")
    Optional<ChatRoom> findByIdWithParticipants(Long roomId);
}