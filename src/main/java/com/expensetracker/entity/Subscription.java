package com.expensetracker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "subscriptions")
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @JsonIgnore
    @Column(name = "user_id")
    private Long userId;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false)
    private double amount;
    @Column(nullable = false)
    private int billingDay;

    public Subscription() {}
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public int getBillingDay() { return billingDay; }
    public void setBillingDay(int billingDay) { this.billingDay = billingDay; }
}
