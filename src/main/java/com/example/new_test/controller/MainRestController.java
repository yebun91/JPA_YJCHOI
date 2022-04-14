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

        // 한 페이지에 보여줄 data 개수
        int length = requestBody.getLength();
        // 0 이면 0부터~~ 10이면 10부터 ~~ length 만큽 보여줌
        int start = requestBody.getStart();
        // 검색하고 싶은 검색어
        String search = requestBody.getSearch().get(DataTablesInput.SearchCriterias.value);
        // 컬럼 이름을 가져오기 위해 몆 번째 컬럼인지 숫자를 가져옴
        int columnNum = Integer.parseInt(requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.column));
        // 어떤 컬럼을 기준으로 정렬할 것인지 컬럼 이름을 가져옴 컬럼들().get(columnNum) 이용
        String column = requestBody.getColumns().get(columnNum).getData();
        // 순차 검색인지 역순 검색인지
        String order = requestBody.getOrder().get(0).get(DataTablesInput.OrderCriterias.dir);
        // 무엇을 기준으로 검색할 것인지  where id = '뫄뫄' 에서 id가 있는 부분을 나타님
        String searchWhere = requestBody.getData().get("searchWhere");

        String list = "SELECT mb FROM Member mb " +
                "WHERE mb."+searchWhere+" " +
                "LIKE '%"+search+"%' " +
                "ORDER BY "+column+" "+order;

        List<Member> members = em.createQuery(list, Member.class)
                .setFirstResult(start)
                .setMaxResults(length)
                .getResultList();

        String count = "SELECT COUNT(mb.id) FROM Member mb " +
                "WHERE mb."+searchWhere+" " +
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
