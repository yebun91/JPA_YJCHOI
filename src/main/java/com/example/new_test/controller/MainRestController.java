package com.example.new_test.controller;

import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberMapper memberMybatiseRepository;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody) {
        List<MemberDto> data;
        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();
        String search = requestBody.getSearch().get(DataTablesInput.SearchCriterias.value);
        int culumnNum = Integer.parseInt(requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.column));
        String culumn = requestBody.getColumns().get(culumnNum).getData();
        String order = requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.dir);
        String searchWhere = requestBody.getData().get("searchWhere");

//        System.out.println("search : "+search+", culumn : "+culumn+", order : "+order+", searchWhere : "+searchWhere);

        data = memberMybatiseRepository.findData(start, length, search, culumn, order, searchWhere);
        int total = memberMybatiseRepository.findDataTotalCount(search, searchWhere);
        DataTablesOutput output = DataTablesOutput.builder()
                        .data(data)
                        .draw(draw)
                        .recordsFiltered(total)
                        .recordsTotal(total)
                        .build();
        return output;
    }
}
