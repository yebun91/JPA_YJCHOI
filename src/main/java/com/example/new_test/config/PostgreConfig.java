package com.example.new_test.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

// package 전체를 mapper로 사용할 때 사용하기 위해 남겨둠
@Configuration
@MapperScan(basePackages = "com.example.new_test.mapper")
public class PostgreConfig {

}
