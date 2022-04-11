package com.example.new_test.controller;

import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;
    private MemberMapper memberMybatiseRepository;


/*    @GetMapping("/search")
    public List<Member> search(String name) throws Exception {
        List<Member> memberList;
        if (name.equals("") || name.equals("all")) {
            memberList = memberRepository.findAll();
        } else {
            memberList = memberRepository.findByNameContains(name);
        }
        return memberList;
    }*/

    @PostMapping("/search")
    public DataTablesOutput search(DataTablesOutput dataTablesOutput, @RequestBody DataTablesInput requestBody) throws Exception {
        List<MemberDto> data;

        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();
//        data = memberMybatiseRepository.findData(start, length);
        data = memberMybatiseRepository.findAll();
        int total = data.size();

        dataTablesOutput.setDraw(draw);
        dataTablesOutput.setData(data);
        dataTablesOutput.setRecordsFiltered(total);
        dataTablesOutput.setRecordsTotal(total);

        return dataTablesOutput;
    }
}
