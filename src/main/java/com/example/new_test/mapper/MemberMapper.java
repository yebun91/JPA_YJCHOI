package com.example.new_test.mapper;

import com.example.new_test.entity.MemberDto;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

public interface MemberMapper {
@Mapper
    List<MemberDto> findData(Long start, int length, String search, String culumn, String order, String searchWhere);
    int findDataTotalCount(String search, String searchWhere);
}
