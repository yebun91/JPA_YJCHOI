package com.example.new_test.socket;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class Client {
    public static void main(String[] args) throws Exception {
        //서버 소켓을 생성
//        ServerSocket sock = new ServerSocket(5050);
        Socket sock = new Socket("127.0.0.1" , 8080);
        InputStream is = null;
        OutputStream os = null;
        System.out.println("Waiting");


        is = sock.getInputStream();
        os = sock.getOutputStream();

        System.out.println("response : "+is);
        String msg = String.format("How are you doing?");
        os.write(msg.getBytes(StandardCharsets.UTF_8));
        os.flush();
        os.close();

    }
}
