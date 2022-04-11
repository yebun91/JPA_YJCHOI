package com.example.new_test.entity;

import lombok.*;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
@ToString
public class DataTablesOutput {
    private int draw;
    private int recordsTotal;
    private int recordsFiltered;
    private List<MemberDto> data;

    public List<MemberDto> getData(){
        if(CollectionUtils.isEmpty(data)){
            data = new ArrayList();
        }
        return data;
    }
}