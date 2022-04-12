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
    public enum SearchCriterias {value, regex}
    public enum OrderCriterias {column, dir}
}
