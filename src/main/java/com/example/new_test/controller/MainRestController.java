package com.example.new_test.controller;

import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class MainRestController {

    @GetMapping("/insert")
    public void get(@RequestBody RestController ddd) throws Exception{

    }

    @PostMapping("/insert")
    public void post(@RequestBody RestController ddd) throws Exception{

    }

}
