package com.example.new_test.socket;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;

public class Server {
    public static void main(String[] args) throws IOException {
        int port = 5050;
        //서버 소켓을 생성
        int number = Integer.parseInt(args[0]); // 명렬줄로 들어온 텍스트값을 정수형으로 변환시켜 저장
        String str = new String(args[1]);
        //서버 소켓을 생성
        ServerSocket ssk = new ServerSocket(port);

        System.out.println("Waiting");
        Socket sock = null;
        while(true) { //실제로 송신을 하는것은 바로 저 sock 이라는 변수이다.
            sock = ssk.accept();
            System.out.println("User logged in.");
            System.out.println("Client ip :"+ sock.getInetAddress());


            //클라이언트와 연결을 하기위한 스트림을 생성한다.
            OutputStream ous = sock.getOutputStream();
            DataOutputStream dous = new DataOutputStream(ous);

            dous.writeUTF(str);
            dous.writeInt(number);
            dous.flush();
            dous.close();
            sock.close();
        }
    }
}
