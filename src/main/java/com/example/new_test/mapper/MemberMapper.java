package com.example.new_test.mapper;

import com.example.new_test.entity.Member;
import com.example.new_test.entity.MemberDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.HashMap;
import java.util.List;

public interface MemberMapper {
@Mapper
    List<Member> findData(Long start, int length, String order, HashMap<String, String> searchMap);
    int findDataTotalCount(@Param("searchMap") HashMap<String, String> searchMap);
}
