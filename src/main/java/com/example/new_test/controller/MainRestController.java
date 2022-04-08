package com.example.new_test.controller;

import com.example.new_test.entity.Column;
import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;

    @GetMapping("/search")
    public List<Member> search(String name) {
        List<Member> memberList;
        if(name == "" || name.equals("all")){
            memberList = memberRepository.findAll();
        }else{
            memberList = memberRepository.findByNameLike(name);
        }
        return memberList;
    }

    /*@GetMapping("/search")
    public Column search(String name, Column dto, @RequestBody MultiValueMap<String, String> formData) {
        List<Member> memberList;
        if(name == "" || name.equals("all")){
            memberList = memberRepository.findAll();
        }else{
            memberList = memberRepository.findByNameLike(name);
        }
        int draw = Integer.parseInt(formData.get("draw").get(0));
        int total = (int)memberRepository.count();

        dto.setDraw(draw);
        dto.setRecordsFiltered(total);
        dto.setRecordsTotal(total);
        dto.setData(memberList);

        return dto;
    }*/
}
