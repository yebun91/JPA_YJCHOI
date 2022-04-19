package com.example.new_test.entity;

import lombok.*;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class DataTablesOutput {
    private int draw;
    private int recordsTotal;
    private int recordsFiltered;
    private List<Member> data;
}
