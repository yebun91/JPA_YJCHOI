package com.example.new_test.config;

import com.example.new_test.entity.Member;
import com.example.new_test.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DummyDataConfig implements CommandLineRunner {

    private final MemberRepository memberRepository;

    @Override
    public void run(String... args) throws Exception {
        if (!memberRepository.findById(1L).isPresent()) {
            Member member1 = memberRepository.save(Member.builder().age(11).hobby("playGame").name("faker").build());
            Member member2 = memberRepository.save(Member.builder().age(22).hobby("readBook").name("J.K.L").build());
            Member member3 = memberRepository.save(Member.builder().age(33).hobby("sleeping").name("me").build());
        }
    }
}
