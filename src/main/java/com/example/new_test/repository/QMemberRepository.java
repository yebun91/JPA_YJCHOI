package com.example.new_test.repository;

import com.example.new_test.entity.Member;
import com.example.new_test.entity.QMember;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.PathBuilder;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.thymeleaf.util.StringUtils;

import java.util.HashMap;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class QMemberRepository {
    private final JPAQueryFactory jpaQueryFactory;

    public Page<Member> searchQueryDSL(HashMap<String, String> info, Pageable pageable, HashMap<String, String> order) {
        QMember member = QMember.member;
        JPAQuery<Member> query = jpaQueryFactory.selectFrom(member)
                .where(containId(info.get("id"), member),
                        containName(info.get("name"), member),
                        containAge(info.get("age"), member),
                        containHobby(info.get("hobby"), member))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize());

        JPAQuery<Long> countQuery = jpaQueryFactory.select(member.count()).from(member)
                .where(containId(info.get("id"), member),
                        containName(info.get("name"), member),
                        containAge(info.get("age"), member),
                        containHobby(info.get("hobby"), member));

        for (Sort.Order o : pageable.getSort()) {
            PathBuilder<Member> pathBuilder = new PathBuilder<>(member.getType(), member.getMetadata());
            query.orderBy(new OrderSpecifier(o.isAscending() ? Order.ASC : Order.DESC,
                    pathBuilder.get(o.getProperty())));
        }
        List<Member> content = query.fetch();
        long total = countQuery.fetchOne();


        return new PageImpl<>(content, pageable, total);
    }
    private BooleanExpression containId(String id, QMember member) {
        return StringUtils.isEmpty(id) ? null : member.name.contains(id);
    }

    private BooleanExpression containName(String name, QMember member) {
        return StringUtils.isEmpty(name) ? null : member.name.contains(name);
    }

    private BooleanExpression containAge(String age, QMember member) {
        return StringUtils.isEmpty(age) ? null : member.hobby.contains(age);
    }

    private BooleanExpression containHobby(String hobby, QMember member) {
        return StringUtils.isEmpty(hobby) ? null : member.hobby.contains(hobby);
    }
}
