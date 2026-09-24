package com.gem.procurement.repository;

import com.gem.procurement.model.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    // Oracle-compatible: use COUNT instead of EXISTS (avoids LIMIT 1 clause)
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN TRUE ELSE FALSE END FROM User u WHERE u.username = :username")
    Boolean existsByUsername(@Param("username") String username);

    Optional<User> findByEmail(String email);

    // Oracle-compatible: use COUNT instead of EXISTS
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN TRUE ELSE FALSE END FROM User u WHERE u.email = :email")
    Boolean existsByEmail(@Param("email") String email);

    Optional<User> findByEmailOrUsername(String email, String username);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email) OR LOWER(u.username) = LOWER(:username)")
    Optional<User> findByEmailIgnoreCaseOrUsernameIgnoreCase(@Param("email") String email, @Param("username") String username);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);
}
