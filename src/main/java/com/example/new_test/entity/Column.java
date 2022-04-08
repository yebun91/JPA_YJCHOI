package com.example.new_test.entity;

import lombok.Data;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class Column {
    private int draw;
    private int recordsTotal;
    private int recordsFiltered;

    private List data;

    public List getData(){
        if(CollectionUtils.isEmpty(data)){
            data = new ArrayList();
        }
        return data;
    }

}
