package com.example.new_test.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan(basePackages = "com.example.new_test.mapper.MemberMapper")
public class PostgreConfig {

}
