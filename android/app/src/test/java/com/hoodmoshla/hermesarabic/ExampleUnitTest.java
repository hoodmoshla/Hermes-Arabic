package com.hoodmoshla.hermesarabic;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ExampleUnitTest {
    @Test
    public void applicationIdIsIndependent() {
        assertEquals("com.hoodmoshla.hermesarabic", BuildConfig.APPLICATION_ID);
    }

    @Test
    public void versionIsInitialDevelopmentRelease() {
        assertEquals("0.1.0", BuildConfig.VERSION_NAME);
    }
}
