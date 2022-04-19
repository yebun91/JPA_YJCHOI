package com.example.new_test.controller;

import com.example.new_test.entity.*;
import com.example.new_test.mapper.MemberMapper;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@AllArgsConstructor
public class MainRestController {

    private MemberMapper memberMybatiseRepository;
    private EntityManager em;

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


        String list = "SELECT mb FROM Member mb " +
                "ORDER BY "+order;

        List<Member> member = em.createQuery(list, Member.class)
                .setFirstResult(start.intValue())
                .setMaxResults(length)
                .getResultList();

        String count = "SELECT COUNT(mb.id) FROM Member mb";

        int total = em.createQuery(count, Long.class).getSingleResult().intValue();

        DataTablesOutput output = DataTablesOutput.builder()
                .draw(draw)
                .recordsFiltered(total)
                .recordsTotal(total)
                .data(member)
                .build();

        return output;

    }
}
