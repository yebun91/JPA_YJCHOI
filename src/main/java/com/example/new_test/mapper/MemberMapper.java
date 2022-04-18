package com.example.new_test.mapper;

import com.example.new_test.entity.MemberDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public interface MemberMapper {
@Mapper
    List<MemberDto> findData(Long start, int length, ArrayList order, HashMap<String, String> searchMap);
    int findDataTotalCount(@Param("searchMap") HashMap<String, String> searchMap);
}
