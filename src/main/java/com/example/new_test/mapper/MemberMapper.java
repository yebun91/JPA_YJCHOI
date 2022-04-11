package com.example.new_test.mapper;

import com.example.new_test.entity.MemberDto;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface MemberMapper {
    List<MemberDto> findData(Long start, int length);
    List<MemberDto> findAll();
}
