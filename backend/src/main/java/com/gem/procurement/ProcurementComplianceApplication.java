package com.gem.procurement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ProcurementComplianceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProcurementComplianceApplication.class, args);
    }
}
