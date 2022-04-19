package com.example.new_test.controller;

<<<<<<< HEAD
import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
=======
import com.example.new_test.entity.Column;
import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
>>>>>>> mybatis
import lombok.AllArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

<<<<<<< HEAD
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
=======
    private MemberMapper memberMybatiseRepository;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody) {
        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();

        HashMap<String, String> searchMap = new HashMap<>();
        List<Column> columns = requestBody.getColumns();
        for (int i = 0; i < columns.size(); i++) {
            String columnData = columns.get(i).getSearch().get(DataTablesInput.SearchCriterias.value);
            if(!columnData.equals("") && columnData != null){
                searchMap.put(columns.get(i).getData(), columnData);
            }
        }

        ArrayList orderList = new ArrayList();
        List<Map<DataTablesInput.OrderCriterias, String>> arrayOrder = requestBody.getOrder();
        for (int i = 0; i < arrayOrder.size(); i++) {
            String columnNum = arrayOrder.get(i).get(DataTablesInput.OrderCriterias.column);
            String column = requestBody.getColumns().get(Integer.parseInt(columnNum)).getData();
            String dir = arrayOrder.get(i).get(DataTablesInput.OrderCriterias.dir);
            orderList.add(column+" "+dir);
        }
        String order = String.join(", ", orderList);

        List<MemberDto> data = memberMybatiseRepository.findData(start, length, order, searchMap);
        int total = memberMybatiseRepository.findDataTotalCount(searchMap);

        DataTablesOutput output = DataTablesOutput.builder()
                        .data(data)
                        .draw(draw)
                        .recordsFiltered(total)
                        .recordsTotal(total)
                        .build();
        return output;
>>>>>>> mybatis
    }
}
