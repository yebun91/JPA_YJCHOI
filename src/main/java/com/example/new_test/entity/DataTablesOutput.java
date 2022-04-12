package com.example.new_test.entity;

import lombok.*;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@Builder
//@NoArgsConstructor
//@Getter
//@Setter
public class DataTablesOutput {
    private int draw;
    private int recordsTotal;
    private int recordsFiltered;
    private List<Member> data;

}
