package com.example.new_test.service;

import com.example.new_test.entity.MemberDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MemberMybatiseImpl{
    public List<MemberDto> findData(Long start, int length) {
        return findData(start, length);
    }
    public List<MemberDto> findAll() {
        return findAll();
    }
}
