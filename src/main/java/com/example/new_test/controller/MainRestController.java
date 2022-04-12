package com.example.new_test.controller;

import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;

    @GetMapping("/search")
    public List<Member> search(String search, int start, int length, int draw) {
        int page = start / length;
        Pageable pageable = PageRequest.of(page, length);
        List<Member> memberList;
        Page<Member> responseData = memberRepository.findAll(pageable);

        DataTablesOutput dataTablesOutput = new DataTablesOutput();

        dataTablesOutput

        if (search.equals("") || search.equals("all")) {
            memberList = memberRepository.findAll(pageable);
        } else {
            memberList = memberRepository.findByNameContains(search);
        }
        return memberList;
    }
}
