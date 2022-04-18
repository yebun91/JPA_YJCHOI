package com.example.new_test.controller;

import com.example.new_test.entity.Column;
import com.example.new_test.entity.DataTablesInput;
import com.example.new_test.entity.DataTablesOutput;
import com.example.new_test.entity.MemberDto;
import com.example.new_test.mapper.MemberMapper;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@AllArgsConstructor
public class MainRestController {

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

        ArrayList order = new ArrayList();
        List<Map<DataTablesInput.OrderCriterias, String>> arrayOrder = requestBody.getOrder();
        for (int i = 0; i < arrayOrder.size(); i++) {
            String columnNum = arrayOrder.get(i).get(DataTablesInput.OrderCriterias.column);
            String column = requestBody.getColumns().get(Integer.parseInt(columnNum)).getData();
            String dir = arrayOrder.get(i).get(DataTablesInput.OrderCriterias.dir);
            order.add(column+" "+dir);
        }

        List<MemberDto> data = memberMybatiseRepository.findData(start, length, order, searchMap);
        int total = memberMybatiseRepository.findDataTotalCount(searchMap);

        DataTablesOutput output = DataTablesOutput.builder()
                        .data(data)
                        .draw(draw)
                        .recordsFiltered(total)
                        .recordsTotal(total)
                        .build();
        return output;
    }
}
