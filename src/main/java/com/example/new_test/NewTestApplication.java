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

        // 연길시에 소켓이 생성된다. 연결이 안될경우에는 예외발생한다.
        Socket sock = new Socket("127.0.0.1" , 8080);
        System.out.println("Connected to the server.");

        System.out.println("Waiting");
        InputStream is = null; // The input stream from a client is to be received.
        OutputStream os = null; // The output stream to a client is to be sent.

        try {
            // To read data from a client.
            is = sock.getInputStream();
            // To send acknowledge to a client
            os = sock.getOutputStream();


            while(true) { //실제로 송신을 하는것은 바로 저 sock 이라는 변수이다.
                String msg = String.format("Hello!");
                os.write(msg.getBytes(StandardCharsets.UTF_8));
                os.flush();

                System.out.println("User logged in.");
                System.out.println("Client ip :"+ sock.getInetAddress());

                System.out.println("답장이 왔음당 : "+is);

                os.close();
//                sock.close();
            }
        }catch (Exception e){

        }
    }
}
