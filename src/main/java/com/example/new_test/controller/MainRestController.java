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
        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();

        // 검색하고 싶은 검색어
        String search = requestBody.getSearch().get(DataTablesInput.SearchCriterias.value);

        // 컬럼 이름을 가져오기 위해 몆 번째 컬럼인지 숫자를 가져옴
        int culumnNum = Integer.parseInt(requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.column));

        // 어떤 컬럼을 기준으로 정렬할 것인지 컬럼 이름을 가져옴 컬럼들().get(culumnNum) 이용
        String culumn = requestBody.getColumns().get(culumnNum).getData();

        // 순차 검색인지 역순 검색인지
        String order = requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.dir);

        // 무엇을 기준으로 검색할 것인지  where id = '뫄뫄' 의 id
        String searchWhere = requestBody.getData().get("searchWhere");

        // System.out.println("search : "+search+", culumn : "+culumn+", order : "+order+", searchWhere : "+searchWhere);

        List<MemberDto> data = memberMybatiseRepository.findData(start, length, search, culumn, order, searchWhere);
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
