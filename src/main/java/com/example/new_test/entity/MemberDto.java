package com.example.new_test.entity;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MemberDto {

    private Long id;
    private int age;
    private String hobby;
    private String name;

}
