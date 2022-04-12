package com.example.new_test.controller;

import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;

    @GetMapping("/search")
    public List<Member> search(String search) {
        List<Member> memberList;
        if (search.equals("") || search.equals("all")) {
            memberList = memberRepository.findAll();
        } else {
            memberList = memberRepository.findByNameContains(search);
        }
        return memberList;
    }
}
