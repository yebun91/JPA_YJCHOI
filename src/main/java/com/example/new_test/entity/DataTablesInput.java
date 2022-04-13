package com.example.new_test.entity;

import lombok.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@NoArgsConstructor
@Getter
@Setter
public class DataTablesInput {
    private HashMap<String,String> data;
    private int draw;
    private int start;
    private int length;
    private List<Map<OrderCriterias, String>> order;
    private List<Column> columns;
    private Map<SearchCriterias, String> search;
    public enum SearchCriterias {value, regex}

//    enum : 클래스처럼 보이게 하는 상수, 서로 관련 있는 상수들을 모아 심볼릭한 명칭의 집합으로 정의한 것(???)
//    생성 방법 - enum 열거체이름 {상수1이름, 상수2이름, ...}
//    사용 방법 - 열거체이름.상수이름
//    regex : 검색어를 정규식으로 해석해야 하는지 그렇지 않은지 가져오는 값. false, true 두가지가 있움
    public enum OrderCriterias {column, dir}
//    {column: 0, dir: 'asc' 또는 desc'} 와 같은 형식으로 보내짐
//    column 0은 첫 번쨰 컬럼을 이야기 하는것. 여기에서는 id 0일 경우 name을 의미한다.

}
