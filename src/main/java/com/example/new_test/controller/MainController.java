package com.example.new_test.controller;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@AllArgsConstructor
public class MainController {

    @GetMapping("/")
    public String mybatis(Model model){
        model.addAttribute("headLine","project");
        model.addAttribute("subHeadLine","mybatis");
        return "menu/mybatis";
    }

    @GetMapping("/jpa")
    public String jpa(Model model){
        model.addAttribute("headLine","project");
        model.addAttribute("subHeadLine","jpa");
        return "menu/jpa";
    }
}
