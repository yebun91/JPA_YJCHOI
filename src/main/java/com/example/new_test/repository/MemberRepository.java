package com.example.new_test.repository;

import com.example.new_test.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Page<Member> findByNameContains(String search, Pageable pageable);

    @Query("SELECT mb FROM Member mb WHERE mb.name LIKE %?1%")
    Page<Member> selectAllJPQL (String search, Pageable pageable, String searchWhere);


}
