package com.example.new_test.controller;

import com.example.new_test.entity.Column;
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

import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import java.util.List;

@RestController
@AllArgsConstructor
public class MainRestController {

    private EntityManager em;

    @PostMapping("/search")
    public DataTablesOutput search(@RequestBody DataTablesInput requestBody ) {
        int draw = requestBody.getDraw();
        int length = requestBody.getLength();
        int start = requestBody.getStart();

        // 검색하고 싶은 검색어
        String search = "";
        // 무엇을 기준으로 검색할 것인지  where id = '뫄뫄' 의 id
        String searchType = "name";

        List<Column> columns = requestBody.getColumns();
        for (int i = 0; i < columns.size(); i++) {
            String columnData = columns.get(i).getSearch().get(DataTablesInput.SearchCriterias.value);
            if(!columnData.equals("") && columnData != null){
                search = columnData; // 검색어
                searchType = columns.get(i).getData(); //검색할 컬럼명
            }
        }

        // 컬럼 이름을 가져오기 위해 몆 번째 컬럼인지 숫자를 가져옴
        int columnNum = Integer.parseInt(requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.column));
        // 어떤 컬럼을 기준으로 정렬할 것인지 컬럼 이름을 가져옴 컬럼들().get(culumnNum) 이용
        String column = requestBody.getColumns().get(columnNum).getData();
        // 순차 검색인지 역순 검색인지
        String order = requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.dir);


        String list = "SELECT mb FROM Member mb " +
                "WHERE mb."+searchType+" " +
                "LIKE '%"+search+"%' " +
                "ORDER BY "+column+" "+order;

        List<Member> members = em.createQuery(list, Member.class)
                .setFirstResult(start)
                .setMaxResults(length)
                .getResultList();

        String count = "SELECT COUNT(mb.id) FROM Member mb " +
                "WHERE mb."+searchType+" " +
                "LIKE '%"+search+"%'";

        int total = em.createQuery(count, Long.class).getSingleResult().intValue();

        DataTablesOutput output = DataTablesOutput.builder()
                .draw(draw)
                .recordsFiltered(total)
                .recordsTotal(total)
                .data(members)
                .build();

        return output;
    }
}
