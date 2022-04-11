package com.example.new_test.service;

import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MemberMybatiseImpl implements MemberMapper {

    @Override
    public List<MemberDto> findData(Long start, int length) {
        return findData(start, length);
    }

    @Override
    public List<MemberDto> findAll() {
        return findAll();
    }
}
