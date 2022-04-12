package com.example.new_test.entity;

import lombok.*;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;

//@NoArgsConstructor
//@Getter
//@Setter
@Data
@Builder
public class DataTablesOutput {
    private int draw;
    private int recordsTotal;
    private int recordsFiltered;
    private List<MemberDto> data;


}
