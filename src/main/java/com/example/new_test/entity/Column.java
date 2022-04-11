package com.example.new_test.entity;

import lombok.*;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@NoArgsConstructor
@Getter
@Setter
@ToString
public class Column {
    private String data;
    private String name;
    private boolean searchable;
    private boolean orderable;
    private Map<DataTablesInput.SearchCriterias, String> search;
}
