package com.example.new_test.controller;

import com.example.new_test.repository.MemberRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@AllArgsConstructor
public class MainController {

    @RequestMapping("/")
    public String main(){
        return "index";
    }

}
