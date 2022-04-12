package com.example.new_test.controller;

import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberRepository memberRepository;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody ) {

        int draw = requestBody.getDraw();
        int length = requestBody.getLength();
        int start = requestBody.getStart();
        String search = requestBody.getData().get("name");
        int page = start / length;

        Pageable pageable = PageRequest.of(page, length, Sort.Direction.ASC, "id");
        Page<Member> data = memberRepository.findByNameContains(search, pageable);

        int total = Long.valueOf(data.getTotalElements()).intValue();

        DataTablesOutput output = DataTablesOutput.builder()
                .draw(draw)
                .recordsFiltered(total)
                .recordsTotal(total)
                .data(data.toList())
                .build();

        return output;

    }
}
