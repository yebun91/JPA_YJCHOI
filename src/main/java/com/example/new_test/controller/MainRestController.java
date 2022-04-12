package com.example.new_test.controller;

import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;
    private MemberMapper memberMybatiseRepository;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody) {
        List<MemberDto> data;

        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();
        String search = requestBody.getData().get("name");
        data = memberMybatiseRepository.findData(start, length, search);
        int total = memberMybatiseRepository.findDataTotalCount(search);

        DataTablesOutput output = DataTablesOutput.builder()
                        .data(data)
                        .draw(draw)
                        .recordsFiltered(total)
                        .recordsTotal(total)
                        .build();

        return output;
    }
}
