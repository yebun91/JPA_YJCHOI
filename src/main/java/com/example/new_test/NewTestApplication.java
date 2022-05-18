package com.example.new_test;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@SpringBootApplication
public class NewTestApplication {

    public static void main(String[] args) throws IOException {

        SpringApplication.run(NewTestApplication.class, args);

    }
}
