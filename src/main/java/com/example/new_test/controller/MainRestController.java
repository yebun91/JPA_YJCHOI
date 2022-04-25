package com.example.new_test.controller;

import com.example.new_test.entity.*;
import com.example.new_test.mapper.MemberMapper;
import com.example.new_test.repository.QMemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberMapper memberMybatiseRepository;
    private QMemberRepository qMemberRepository;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody) {
        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();

        HashMap<String, String> searchMap = new HashMap<>();
        for (Column column : requestBody.getColumns()) {
            String columnData = column.getSearch().get(DataTablesInput.SearchCriterias.value);
            if(!columnData.equals("") && columnData != null){
                searchMap.put(column.getData(), columnData);
            }
        }

        ArrayList orderList = new ArrayList();

        for (Map<DataTablesInput.OrderCriterias, String> arrayOrder : requestBody.getOrder()) {
            String columnNum = arrayOrder.get(DataTablesInput.OrderCriterias.column);
            String column = requestBody.getColumns().get(Integer.parseInt(columnNum)).getData();
            String dir = arrayOrder.get(DataTablesInput.OrderCriterias.dir);
            orderList.add(column+" "+dir);
        }

        String order = String.join(", ", orderList);

        List<Member> data = memberMybatiseRepository.findData(start, length, order, searchMap);
        int total = memberMybatiseRepository.findDataTotalCount(searchMap);

        DataTablesOutput output = DataTablesOutput.builder()
                .data(data)
                .draw(draw)
                .recordsFiltered(total)
                .recordsTotal(total)
                .build();
        return output;

    }

    @PostMapping("/searchJPA")
    public DataTablesOutput searchJPA(@RequestBody DataTablesInput requestBody) {
        int draw = requestBody.getDraw();
        Long start = requestBody.getStart();
        int length = requestBody.getLength();

        HashMap<String, String> searchMap = new HashMap<>();
        List<Column> columns = requestBody.getColumns();

        for (Column column : columns) {
            String columnData = column.getSearch().get(DataTablesInput.SearchCriterias.value);
            if(!columnData.equals("") && columnData != null){
                searchMap.put(column.getData(), columnData);
            }
        }

        int page = start.intValue() / length;
        HashMap<String, String> orderMap = new HashMap<>();
        List<Sort.Order> orderList = new ArrayList<>();

        for(Map<DataTablesInput.OrderCriterias, String> orderInfo : requestBody.getOrder()){
            Sort.Direction direction = Sort.Direction.ASC;
            if(orderInfo.get(DataTablesInput.OrderCriterias.dir).equals("desc"))
                direction = Sort.Direction.DESC;
            String orderColumnNum = orderInfo.get(DataTablesInput.OrderCriterias.column);
            int columnIdx = 0;
            try{
                columnIdx = Integer.parseInt(orderColumnNum);
            } catch (NumberFormatException e) {
                //do Nothing
            }
            String orderColumn = requestBody.getColumns().get(columnIdx).getData();
            orderList.add(new Sort.Order(direction, orderColumn));
        }
        Sort sort = Sort.by(orderList);
        Pageable pageable = PageRequest.of(page, length, sort);

        Page<Member> data = qMemberRepository.searchQueryDSL(searchMap, pageable, orderMap);
        int total = (int)data.getTotalElements();
        DataTablesOutput output = DataTablesOutput.builder()
                .draw(draw)
                .recordsFiltered(total)
                .recordsTotal(total)
                .data(data.getContent())
                .build();

        return output;
    }
}
