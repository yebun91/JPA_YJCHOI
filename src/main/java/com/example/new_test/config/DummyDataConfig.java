package com.example.new_test.config;

import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.Random;

@Configuration
@RequiredArgsConstructor
public class DummyDataConfig implements CommandLineRunner {

    Random random = new Random();
    private final MemberRepository memberRepository;
    String[] name = {"가나", "다라", "마바", "사아", "자차"};
    String[] hobby = {"불멍때리기", "게임하기", "산책하기", "카페가기", "아무것도 하지 않기", "맛집탐방"};

    @Override
    public void run(String... args) throws Exception {
        if (!memberRepository.findById(1L).isPresent()) {
            for (int i = 0 ; i<100; i++){
                Member member = memberRepository.save(
                        Member.builder()
                                .age(random.nextInt(100)+1)
                                .hobby(hobby[random.nextInt(hobby.length)])
                                .name(name[random.nextInt(name.length)]).build()
                );
            }
        }
    }
}
